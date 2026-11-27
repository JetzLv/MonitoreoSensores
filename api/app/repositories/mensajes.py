from bson import ObjectId
from bson.errors import InvalidId


def _filtro(usuario) -> dict:
    if usuario.rol == "administrador":
        return {}
    return {"$or": [{"para_rol": usuario.rol}, {"para_usuario": usuario.id}]}


def _salida(doc: dict, usuario_id: int) -> dict:
    doc["id"] = str(doc.pop("_id"))
    doc["leido"] = usuario_id in doc.pop("leido_por", [])
    return doc


async def listar(db, usuario, solo_no_leidos: bool, limite: int) -> list[dict]:
    filtro = _filtro(usuario)
    if solo_no_leidos:
        filtro = {**filtro, "leido_por": {"$ne": usuario.id}}
    cursor = db.mensajes.find(filtro).sort("creado_en", -1).limit(limite)
    return [_salida(d, usuario.id) async for d in cursor]


async def no_leidos(db, usuario) -> int:
    return await db.mensajes.count_documents({**_filtro(usuario), "leido_por": {"$ne": usuario.id}})


async def marcar_todos(db, usuario) -> int:
    resultado = await db.mensajes.update_many({**_filtro(usuario), "leido_por": {"$ne": usuario.id}},
                                              {"$addToSet": {"leido_por": usuario.id}})
    return resultado.modified_count


async def marcar_leido(db, usuario, mensaje_id: str) -> bool:
    try:
        id_objeto = ObjectId(mensaje_id)
    except InvalidId:
        return False
    resultado = await db.mensajes.update_one({"_id": id_objeto, **_filtro(usuario)}, {"$addToSet": {"leido_por": usuario.id}})
    return resultado.matched_count == 1
