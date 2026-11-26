from datetime import datetime, timezone

from aio_pika.abc import AbstractIncomingMessage
from bson import ObjectId
from pydantic import ValidationError

from iot_common.mensajes import AlertaEvento


def crear_consumidor(db):
    async def recibir(message: AbstractIncomingMessage):
        try:
            e = AlertaEvento.model_validate_json(message.body)
        except ValidationError:
            await message.reject(requeue=False)
            return
        async with message.process(requeue=True):
            await db.notificaciones.insert_one({
                "alerta_id": ObjectId(e.alerta_id),
                "mensaje": f"[{e.severidad.upper()}] {e.sensor_id}: {e.metrica}={e.valor} rebasa {e.umbral}",
                "creada_en": datetime.now(timezone.utc),
            })
    return recibir
