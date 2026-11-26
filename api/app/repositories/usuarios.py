import bcrypt
from psycopg.errors import UniqueViolation

SELECT_USUARIO = """SELECT u.id_usuario AS id, u.nombre, u.correo, r.nombre AS rol, u.activo
FROM usuario u JOIN rol r USING (id_rol)"""
HASH_FALSO = bcrypt.hashpw(b"x", bcrypt.gensalt(12))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()


def _dict(cursor, fila) -> dict:
    return {col.name: valor for col, valor in zip(cursor.description, fila)}


async def autenticar(pg, correo: str, password: str) -> dict | None:
    async with pg.connection() as con:
        fila = await (await con.execute(
            "SELECT u.id_usuario, u.nombre, u.correo, r.nombre, u.hash_password FROM usuario u JOIN rol r USING (id_rol) "
            "WHERE lower(u.correo) = lower(%s) AND u.activo", (correo,))).fetchone()
    # Se compara aunque el usuario no exista para no revelar qué correos son válidos por el tiempo de respuesta.
    valido = bcrypt.checkpw(password.encode(), fila[4].encode() if fila else HASH_FALSO)
    return {"id": fila[0], "nombre": fila[1], "correo": fila[2], "rol": fila[3]} if fila and valido else None


async def listar(pg) -> list[dict]:
    async with pg.connection() as con:
        cur = await con.execute(f"{SELECT_USUARIO} ORDER BY u.nombre")
        return [_dict(cur, f) for f in await cur.fetchall()]


async def crear(pg, datos: dict) -> dict | None:
    try:
        async with pg.connection() as con:
            cur = await con.execute("""
                INSERT INTO usuario (nombre, correo, hash_password, id_rol)
                VALUES (%s, lower(%s), %s, (SELECT id_rol FROM rol WHERE nombre = %s)) RETURNING id_usuario""",
                (datos["nombre"], datos["correo"], hash_password(datos["password"]), datos["rol"]))
            nuevo = (await cur.fetchone())[0]
    except UniqueViolation:
        return None
    return await obtener(pg, nuevo)


async def obtener(pg, id_usuario: int) -> dict | None:
    async with pg.connection() as con:
        cur = await con.execute(f"{SELECT_USUARIO} WHERE u.id_usuario = %s", (id_usuario,))
        fila = await cur.fetchone()
        return _dict(cur, fila) if fila else None


async def actualizar(pg, id_usuario: int, cambios: dict) -> dict | None:
    sets, params = [], []
    if "rol" in cambios:
        sets.append("id_rol = (SELECT id_rol FROM rol WHERE nombre = %s)"); params.append(cambios["rol"])
    if "activo" in cambios:
        sets.append("activo = %s"); params.append(cambios["activo"])
    if "password" in cambios:
        sets.append("hash_password = %s"); params.append(hash_password(cambios["password"]))
    async with pg.connection() as con:
        await con.execute(f"UPDATE usuario SET {', '.join(sets)} WHERE id_usuario = %s", (*params, id_usuario))
    return await obtener(pg, id_usuario)


async def catalogos(pg) -> dict:
    async with pg.connection() as con:
        resultado = {}
        for clave, sql in {"roles": "SELECT id_rol AS id, nombre, descripcion FROM rol ORDER BY id_rol",
                           "prioridades": "SELECT id_prioridad AS id, nombre, sla_horas FROM prioridad ORDER BY id_prioridad",
                           "estados": "SELECT id_estado AS id, nombre, es_final FROM estado_ticket ORDER BY id_estado"}.items():
            cur = await con.execute(sql)
            resultado[clave] = [_dict(cur, f) for f in await cur.fetchall()]
        return resultado
