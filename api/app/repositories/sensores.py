from datetime import datetime, timezone

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError


def _salida(doc: dict | None) -> dict | None:
    if doc:
        doc["id"] = doc.pop("_id")
    return doc


async def crear(db, datos: dict) -> dict | None:
    ahora = datetime.now(timezone.utc)
    doc = {"_id": datos.pop("id"), **datos, "estado": "activo", "instalado_en": ahora,
           "meta": {"creado_en": ahora, "actualizado_en": ahora}}
    try:
        await db.sensores.insert_one(doc)
    except DuplicateKeyError:
        return None
    return _salida(doc)


async def listar(db, filtros: dict, saltar: int, limite: int) -> list[dict]:
    cursor = db.sensores.find(filtros).sort("_id", 1).skip(saltar).limit(limite)
    return [_salida(d) async for d in cursor]


async def obtener(db, sensor_id: str) -> dict | None:
    return _salida(await db.sensores.find_one({"_id": sensor_id}))


async def actualizar(db, sensor_id: str, cambios: dict) -> dict | None:
    cambios["meta.actualizado_en"] = datetime.now(timezone.utc)
    doc = await db.sensores.find_one_and_update({"_id": sensor_id}, {"$set": cambios},
                                                return_document=ReturnDocument.AFTER)
    return _salida(doc)
