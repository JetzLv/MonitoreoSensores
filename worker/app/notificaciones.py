from datetime import datetime, timezone

from aio_pika.abc import AbstractIncomingMessage
from bson import ObjectId
from pydantic import ValidationError

from iot_common.mensajes import EventoAlerta


def crear_consumidor(db):
    async def recibir(mensaje_amqp: AbstractIncomingMessage):
        try:
            e = EventoAlerta.model_validate_json(mensaje_amqp.body)
        except ValidationError:
            await mensaje_amqp.reject(requeue=False)
            return
        async with mensaje_amqp.process(requeue=True):
            await db.notificaciones.insert_one({
                "alerta_id": ObjectId(e.alerta_id),
                "mensaje": f"[{e.severidad.upper()}] {e.sensor_id}: {e.metrica}={e.valor} rebasa {e.umbral}",
                "creada_en": datetime.now(timezone.utc),
            })
    return recibir
