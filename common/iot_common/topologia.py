import aio_pika
from aio_pika.abc import AbstractChannel

INTERCAMBIO_TELEMETRIA = "telemetria"
INTERCAMBIO_ERRORES = "telemetria.dlx"
INTERCAMBIO_EVENTOS = "eventos"
COLA_INGESTA = "q.ingesta"
COLA_ERRORES = "q.ingesta.errores"
COLA_NOTIFICACIONES = "q.notificaciones"
COLA_MENSAJES = "q.mensajes"


async def declarar(canal: AbstractChannel) -> dict:
    """Idempotente: productor y consumidores la llaman al arrancar."""
    telemetria = await canal.declare_exchange(INTERCAMBIO_TELEMETRIA, aio_pika.ExchangeType.TOPIC, durable=True)
    errores = await canal.declare_exchange(INTERCAMBIO_ERRORES, aio_pika.ExchangeType.FANOUT, durable=True)
    eventos = await canal.declare_exchange(INTERCAMBIO_EVENTOS, aio_pika.ExchangeType.TOPIC, durable=True)

    cola_ingesta = await canal.declare_queue(COLA_INGESTA, durable=True, arguments={"x-dead-letter-exchange": INTERCAMBIO_ERRORES})
    cola_errores = await canal.declare_queue(COLA_ERRORES, durable=True, arguments={"x-max-length": 1000})
    cola_notificaciones = await canal.declare_queue(COLA_NOTIFICACIONES, durable=True)
    cola_mensajes = await canal.declare_queue(COLA_MENSAJES, durable=True)

    await cola_ingesta.bind(telemetria, "lectura.#")
    await cola_errores.bind(errores)
    await cola_notificaciones.bind(eventos, "alerta.#")
    await cola_mensajes.bind(eventos, "mensaje.#")

    return {"telemetria": telemetria, "errores": errores, "eventos": eventos,
            "cola_ingesta": cola_ingesta, "cola_notificaciones": cola_notificaciones, "cola_mensajes": cola_mensajes}
