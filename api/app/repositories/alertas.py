from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId


def _salida(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


async def listar(db, filtros: dict, limite: int) -> list[dict]:
    cursor = db.alertas.find(filtros).sort("creada_en", -1).limit(limite)
    return [_salida(d) async for d in cursor]


async def atender_varias(db, ids: list[str], atendida_por: str) -> int:
    validos = [ObjectId(i) for i in ids if ObjectId.is_valid(i)]
    resultado = await db.alertas.update_many(
        {"_id": {"$in": validos}, "estado": "abierta"},
        {"$set": {"estado": "atendida", "atendida_por": atendida_por, "atendida_en": datetime.now(timezone.utc)}},
    )
    return resultado.modified_count


async def atender(db, alerta_id: str, atendida_por: str) -> tuple[str, dict | None]:
    try:
        id_objeto = ObjectId(alerta_id)
    except InvalidId:
        return "no_existe", None
    resultado = await db.alertas.update_one(
        {"_id": id_objeto, "estado": "abierta"},
        {"$set": {"estado": "atendida", "atendida_por": atendida_por, "atendida_en": datetime.now(timezone.utc)}},
    )
    doc = await db.alertas.find_one({"_id": id_objeto})
    if not doc:
        return "no_existe", None
    return ("ok" if resultado.modified_count else "ya_atendida"), _salida(doc)
