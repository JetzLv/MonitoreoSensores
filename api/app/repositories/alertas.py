from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId


def _salida(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


async def listar(db, filtros: dict, limite: int) -> list[dict]:
    cursor = db.alertas.find(filtros).sort("creada_en", -1).limit(limite)
    return [_salida(d) async for d in cursor]


async def atender(db, alerta_id: str, atendida_por: str) -> tuple[str, dict | None]:
    try:
        oid = ObjectId(alerta_id)
    except InvalidId:
        return "no_existe", None
    res = await db.alertas.update_one(
        {"_id": oid, "estado": "abierta"},
        {"$set": {"estado": "atendida", "atendida_por": atendida_por, "atendida_en": datetime.now(timezone.utc)}},
    )
    doc = await db.alertas.find_one({"_id": oid})
    if not doc:
        return "no_existe", None
    return ("ok" if res.modified_count else "ya_atendida"), _salida(doc)
