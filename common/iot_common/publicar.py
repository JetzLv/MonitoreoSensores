import aio_pika
from aio_pika.abc import AbstractExchange

from .mensajes import EventoMensaje


async def mensaje(eventos: AbstractExchange, evento: EventoMensaje):
    await eventos.publish(
        aio_pika.Message(evento.model_dump_json().encode(), content_type="application/json",
                         delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
        routing_key=f"mensaje.{evento.tipo}",
    )
