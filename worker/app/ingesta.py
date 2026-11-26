import asyncio
import logging
from datetime import datetime, timezone

import aio_pika
from aio_pika.abc import AbstractExchange, AbstractIncomingMessage
from pydantic import ValidationError
from pymongo.errors import DuplicateKeyError

from iot_common import publicar
from iot_common.mensajes import EventoAlerta, EventoMensaje, MensajeLectura, Remitente

from .reglas import evaluar

registro = logging.getLogger("ingesta")

LOTE_MAX = 100
LOTE_SEGUNDOS = 1.0
REFRESCO_SENSORES = 30


class Ingesta:
    def __init__(self, db, intercambio_errores: AbstractExchange, eventos: AbstractExchange):
        self.db = db
        self.intercambio_errores = intercambio_errores
        self.eventos = eventos
        self.sensores: dict[str, dict] = {}
        self.pendientes: list[tuple[AbstractIncomingMessage, MensajeLectura]] = []
        self.candado = asyncio.Lock()

    async def refrescar_sensores(self):
        while True:
            cursor = self.db.sensores.find({}, {"tipo": 1, "ubicacion": 1, "umbrales": 1, "estado": 1})
            self.sensores = {s["_id"]: s async for s in cursor}
            await asyncio.sleep(REFRESCO_SENSORES)

    async def a_errores(self, mensaje_amqp: AbstractIncomingMessage, motivo: str):
        await self.intercambio_errores.publish(
            aio_pika.Message(mensaje_amqp.body, headers={"motivo": motivo[:500]}, delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
            routing_key="",
        )
        await mensaje_amqp.ack()

    async def recibir(self, mensaje_amqp: AbstractIncomingMessage):
        try:
            lectura = MensajeLectura.model_validate_json(mensaje_amqp.body)
        except ValidationError as e:
            await self.a_errores(mensaje_amqp, e.errors(include_url=False)[0]["msg"])
            return
        sensor = self.sensores.get(lectura.sensor_id)
        if not sensor or sensor["estado"] != "activo" or sensor["tipo"] != lectura.tipo:
            await self.a_errores(mensaje_amqp, "sensor inexistente, inactivo o de otro tipo")
            return
        async with self.candado:
            self.pendientes.append((mensaje_amqp, lectura))
            if len(self.pendientes) >= LOTE_MAX:
                await self._vaciar()

    async def ciclo_lotes(self):
        while True:
            await asyncio.sleep(LOTE_SEGUNDOS)
            async with self.candado:
                await self._vaciar()

    async def _vaciar(self):
        if not self.pendientes:
            return
        lote, self.pendientes = self.pendientes, []
        try:
            await self.db.lecturas.insert_many([self._documento(l) for _, l in lote], ordered=False)
            for _, lectura in lote:
                await self._alertas(lectura)
        except Exception:
            registro.exception("Fallo al guardar el lote; se reencola")
            for mensaje_amqp, _ in lote:
                await mensaje_amqp.nack(requeue=True)
            return
        for mensaje_amqp, _ in lote:
            await mensaje_amqp.ack()

    def _documento(self, l: MensajeLectura) -> dict:
        sensor = self.sensores[l.sensor_id]
        return {
            "ts": l.ts,
            "meta": {"sensor_id": l.sensor_id, "tipo": l.tipo, "edificio": sensor["ubicacion"]["edificio"]},
            "valores": {k: round(v, 2) for k, v in l.valores.items()},
        }

    async def _alertas(self, l: MensajeLectura):
        sensor = self.sensores[l.sensor_id]
        for a in evaluar(l.valores, sensor["umbrales"]):
            doc = {
                "sensor": {"id": l.sensor_id, "tipo": l.tipo, "ubicacion": sensor["ubicacion"]},
                **a,
                "estado": "abierta",
                "ts_lectura": l.ts,
                "creada_en": datetime.now(timezone.utc),
            }
            try:
                resultado = await self.db.alertas.insert_one(doc)
            except DuplicateKeyError:
                continue
            evento = EventoAlerta(alerta_id=str(resultado.inserted_id), sensor_id=l.sensor_id, **a)
            await self.eventos.publish(
                aio_pika.Message(evento.model_dump_json().encode(), content_type="application/json",
                                 delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
                routing_key=f"alerta.{a['severidad']}",
            )
            if a["severidad"] == "critica":
                await publicar.mensaje(self.eventos, EventoMensaje(
                    tipo="alerta_critica", para_rol="monitorista",
                    de=Remitente(tipo="sistema", nombre="Motor de reglas"),
                    referencia={"sensor_id": l.sensor_id, "alerta_id": str(resultado.inserted_id)},
                    asunto=f"Alerta crítica en {l.sensor_id}",
                    cuerpo=f"{a['metrica']} = {a['valor']} rebasa el umbral de {a['umbral']}."))
