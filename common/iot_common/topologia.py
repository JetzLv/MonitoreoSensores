import aio_pika
from aio_pika.abc import AbstractChannel

EX_TELEMETRIA = "telemetria"
EX_DLX = "telemetria.dlx"
EX_EVENTOS = "eventos"
Q_INGESTA = "q.ingesta"
Q_ERRORES = "q.ingesta.errores"
Q_NOTIFICACIONES = "q.notificaciones"
Q_MENSAJES = "q.mensajes"


async def declarar(channel: AbstractChannel) -> dict:
    """Idempotente: productor y consumidores la llaman al arrancar."""
    telemetria = await channel.declare_exchange(EX_TELEMETRIA, aio_pika.ExchangeType.TOPIC, durable=True)
    dlx = await channel.declare_exchange(EX_DLX, aio_pika.ExchangeType.FANOUT, durable=True)
    eventos = await channel.declare_exchange(EX_EVENTOS, aio_pika.ExchangeType.TOPIC, durable=True)

    q_ingesta = await channel.declare_queue(Q_INGESTA, durable=True, arguments={"x-dead-letter-exchange": EX_DLX})
    q_errores = await channel.declare_queue(Q_ERRORES, durable=True, arguments={"x-max-length": 1000})
    q_notif = await channel.declare_queue(Q_NOTIFICACIONES, durable=True)
    q_mensajes = await channel.declare_queue(Q_MENSAJES, durable=True)

    await q_ingesta.bind(telemetria, "lectura.#")
    await q_errores.bind(dlx)
    await q_notif.bind(eventos, "alerta.#")
    await q_mensajes.bind(eventos, "mensaje.#")

    return {"telemetria": telemetria, "dlx": dlx, "eventos": eventos,
            "q_ingesta": q_ingesta, "q_notificaciones": q_notif, "q_mensajes": q_mensajes}
