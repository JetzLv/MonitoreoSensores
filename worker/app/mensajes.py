from datetime import datetime, timezone

from aio_pika.abc import AbstractIncomingMessage
from pydantic import ValidationError

from iot_common.mensajes import EventoMensaje


def crear_consumidor(db):
    async def recibir(message: AbstractIncomingMessage):
        try:
            e = EventoMensaje.model_validate_json(message.body)
        except ValidationError:
            await message.reject(requeue=False)
            return
        async with message.process(requeue=True):
            await db.mensajes.insert_one({**e.model_dump(), "leido_por": [], "creado_en": datetime.now(timezone.utc)})
    return recibir
