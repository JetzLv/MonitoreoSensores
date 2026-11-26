import asyncio
import logging
from datetime import datetime, timedelta, timezone

from iot_common import publicar
from iot_common.mensajes import EventoMensaje, Remitente

registro = logging.getLogger("inactivos")

UMBRAL_MINUTOS = 2
INTERVALO_SEGUNDOS = 60
SISTEMA = Remitente(tipo="sistema", nombre="Monitor de sensores")


def cambios(ultimas: dict, activos: list[str], caidos: set[str], ahora: datetime) -> tuple[set[str], set[str]]:
    limite = ahora - timedelta(minutes=UMBRAL_MINUTOS)
    inactivos = {s for s in activos if ultimas.get(s) is None or ultimas[s] < limite}
    return inactivos - caidos, (caidos - inactivos) & set(activos)


async def ciclo(db, eventos):
    caidos: set[str] = set()
    while True:
        await asyncio.sleep(INTERVALO_SEGUNDOS)
        try:
            ahora = datetime.now(timezone.utc)
            cursor = await db.lecturas.aggregate([
                {"$match": {"ts": {"$gte": ahora - timedelta(hours=1)}}},
                {"$group": {"_id": "$meta.sensor_id", "ultima": {"$max": "$ts"}}},
            ])
            ultimas = {d["_id"]: d["ultima"] async for d in cursor}
            activos = [s["_id"] async for s in db.sensores.find({"estado": "activo"}, {"_id": 1})]
            nuevos, recuperados = cambios(ultimas, activos, caidos, ahora)
            for s in nuevos:
                await publicar.mensaje(eventos, EventoMensaje(
                    tipo="sensor_inactivo", para_rol="monitorista", de=SISTEMA, referencia={"sensor_id": s},
                    asunto=f"{s} dejó de reportar",
                    cuerpo=f"El sensor {s} no ha enviado lecturas en más de {UMBRAL_MINUTOS} minutos."))
            for s in recuperados:
                await publicar.mensaje(eventos, EventoMensaje(
                    tipo="sensor_recuperado", para_rol="monitorista", de=SISTEMA, referencia={"sensor_id": s},
                    asunto=f"{s} volvió a reportar", cuerpo=f"El sensor {s} reanudó el envío de lecturas."))
            caidos = ((caidos | nuevos) - recuperados) & set(activos)
        except Exception:
            registro.exception("Fallo el detector de inactivos")
