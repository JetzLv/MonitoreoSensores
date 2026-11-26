from datetime import datetime, timezone

from aio_pika.abc import AbstractIncomingMessage
from pydantic import ValidationError

from iot_common.mensajes import EventoMensaje


def crear_consumidor(db):
    async def recibir(mensaje_amqp: AbstractIncomingMessage):
        try:
            e = EventoMensaje.model_validate_json(mensaje_amqp.body)
        except ValidationError:
            await mensaje_amqp.reject(requeue=False)
            return
        async with mensaje_amqp.process(requeue=True):
            await db.mensajes.insert_one({**e.model_dump(), "leido_por": [], "creado_en": datetime.now(timezone.utc)})
    return recibir
