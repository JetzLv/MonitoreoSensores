import asyncio
import logging
from datetime import datetime, timedelta, timezone

log = logging.getLogger("resumen")

INTERVALO_SEGUNDOS = 300


def pipeline(desde: datetime) -> list[dict]:
    return [
        {"$match": {"ts": {"$gte": desde}}},
        {"$project": {
            "sensor_id": "$meta.sensor_id", "tipo": "$meta.tipo",
            "hora": {"$dateTrunc": {"date": "$ts", "unit": "hour"}},
            "valores": {"$objectToArray": "$valores"},
        }},
        {"$unwind": "$valores"},
        {"$group": {
            "_id": {"sensor_id": "$sensor_id", "hora": "$hora", "metrica": "$valores.k"},
            "tipo": {"$first": "$tipo"},
            "min": {"$min": "$valores.v"}, "max": {"$max": "$valores.v"}, "prom": {"$avg": "$valores.v"},
            "n": {"$sum": 1},
        }},
        {"$group": {
            "_id": {"sensor_id": "$_id.sensor_id", "hora": "$_id.hora"},
            "tipo": {"$first": "$tipo"},
            "n_lecturas": {"$max": "$n"},
            "metricas": {"$push": {"k": "$_id.metrica", "v": {"min": "$min", "max": "$max", "prom": {"$round": ["$prom", 2]}}}},
        }},
        {"$set": {"metricas": {"$arrayToObject": "$metricas"}}},
        {"$merge": {"into": "resumen_horario", "on": "_id", "whenMatched": "replace", "whenNotMatched": "insert"}},
    ]


async def ciclo(db):
    while True:
        # Recalcula la hora actual y la anterior; $merge lo hace idempotente.
        desde = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
        try:
            await db.lecturas.aggregate(pipeline(desde))
        except Exception:
            log.exception("Fallo el resumen horario")
        await asyncio.sleep(INTERVALO_SEGUNDOS)
