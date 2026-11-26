import asyncio
import json
import logging
import os

import aio_pika
from pymongo import AsyncMongoClient

from iot_common import topologia

from .generador import lectura

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
INTERVALO_SEGUNDOS = 2


async def main():
    db = AsyncMongoClient(os.environ["MONGO_URI"])[os.environ["MONGO_DB"]]
    conexion = await aio_pika.connect_robust(os.environ["RABBITMQ_URL"])
    canal = await conexion.channel()
    telemetria = (await topologia.declarar(canal))["telemetria"]

    while True:
        sensores = await db.sensores.find({"estado": "activo"}, {"tipo": 1, "umbrales": 1}).to_list()
        enviados = 0
        for sensor in sensores:
            msg = lectura(sensor)
            if msg is None:
                continue
            await telemetria.publish(
                aio_pika.Message(json.dumps(msg).encode(), content_type="application/json",
                                 delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
                routing_key=f"lectura.{sensor['tipo']}.{sensor['_id']}",
            )
            enviados += 1
        logging.info("Publicadas %d lecturas", enviados)
        await asyncio.sleep(INTERVALO_SEGUNDOS)


if __name__ == "__main__":
    asyncio.run(main())
