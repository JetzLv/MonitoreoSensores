import asyncio
import logging
import os

import aio_pika
from pymongo import AsyncMongoClient

from iot_common import topologia

from . import inactivos, mensajes, resumen
from .ingesta import LOTE_MAX, Ingesta
from .notificaciones import crear_consumidor

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")


async def principal():
    db = AsyncMongoClient(os.environ["MONGO_URI"], tz_aware=True)[os.environ["MONGO_DB"]]
    conexion = await aio_pika.connect_robust(os.environ["RABBITMQ_URL"])
    canal = await conexion.channel()
    await canal.set_qos(prefetch_count=LOTE_MAX * 2)
    recursos = await topologia.declarar(canal)

    ingesta = Ingesta(db, recursos["errores"], recursos["eventos"])
    tarea_sensores = asyncio.create_task(ingesta.refrescar_sensores())
    while not ingesta.sensores:
        await asyncio.sleep(0.5)

    await recursos["cola_ingesta"].consume(ingesta.recibir)
    await recursos["cola_notificaciones"].consume(crear_consumidor(db))
    await recursos["cola_mensajes"].consume(mensajes.crear_consumidor(db))
    logging.info("Worker listo con %d sensores", len(ingesta.sensores))
    await asyncio.gather(tarea_sensores, ingesta.ciclo_lotes(), resumen.ciclo(db), inactivos.ciclo(db, recursos["eventos"]))


if __name__ == "__main__":
    asyncio.run(principal())
