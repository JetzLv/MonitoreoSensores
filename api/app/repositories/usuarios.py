import bcrypt
from psycopg.errors import UniqueViolation

from ..dependencias import huella_sesion

CONSULTA_USUARIO = """SELECT u.id_usuario AS id, u.nombre, u.correo, r.nombre AS rol, u.activo
FROM usuario u JOIN rol r USING (id_rol)"""
HASH_FALSO = bcrypt.hashpw(b"x", bcrypt.gensalt(12))


def cifrar_contrasena(contrasena: str) -> str:
    return bcrypt.hashpw(contrasena.encode(), bcrypt.gensalt(12)).decode()


def _a_diccionario(cursor, fila) -> dict:
    return {columna.name: valor for columna, valor in zip(cursor.description, fila)}


async def autenticar(pg, correo: str, contrasena: str) -> dict | None:
    async with pg.connection() as conexion:
        fila = await (await conexion.execute(
            "SELECT u.id_usuario, u.nombre, u.correo, r.nombre, u.hash_password FROM usuario u JOIN rol r USING (id_rol) "
            "WHERE lower(u.correo) = lower(%s) AND u.activo", (correo,))).fetchone()
    # Se compara aunque el usuario no exista para no revelar qué correos son válidos por el tiempo de respuesta.
    valido = bcrypt.checkpw(contrasena.encode(), fila[4].encode() if fila else HASH_FALSO)
    if not (fila and valido):
        return None
    return {"id": fila[0], "nombre": fila[1], "correo": fila[2], "rol": fila[3], "huella": huella_sesion(fila[2], fila[4])}


async def listar(pg) -> list[dict]:
    async with pg.connection() as conexion:
        consulta = await conexion.execute(f"{CONSULTA_USUARIO} ORDER BY u.nombre")
        return [_a_diccionario(consulta, f) for f in await consulta.fetchall()]


async def crear(pg, datos: dict) -> dict | None:
    try:
        async with pg.connection() as conexion:
            consulta = await conexion.execute("""
                INSERT INTO usuario (nombre, correo, hash_password, id_rol)
                VALUES (%s, lower(%s), %s, (SELECT id_rol FROM rol WHERE nombre = %s)) RETURNING id_usuario""",
                (datos["nombre"], datos["correo"], cifrar_contrasena(datos["contrasena"]), datos["rol"]))
            nuevo = (await consulta.fetchone())[0]
    except UniqueViolation:
        return None
    return await obtener(pg, nuevo)


async def obtener(pg, id_usuario: int) -> dict | None:
    async with pg.connection() as conexion:
        consulta = await conexion.execute(f"{CONSULTA_USUARIO} WHERE u.id_usuario = %s", (id_usuario,))
        fila = await consulta.fetchone()
        return _a_diccionario(consulta, fila) if fila else None


async def actualizar(pg, id_usuario: int, cambios: dict) -> dict | None:
    asignaciones, parametros = [], []
    if "nombre" in cambios:
        asignaciones.append("nombre = %s"); parametros.append(cambios["nombre"])
    if "correo" in cambios:
        asignaciones.append("correo = lower(%s)"); parametros.append(cambios["correo"])
    if "rol" in cambios:
        asignaciones.append("id_rol = (SELECT id_rol FROM rol WHERE nombre = %s)"); parametros.append(cambios["rol"])
    if "activo" in cambios:
        asignaciones.append("activo = %s"); parametros.append(cambios["activo"])
    if "contrasena" in cambios:
        asignaciones.append("hash_password = %s"); parametros.append(cifrar_contrasena(cambios["contrasena"]))
    try:
        async with pg.connection() as conexion:
            await conexion.execute(f"UPDATE usuario SET {', '.join(asignaciones)} WHERE id_usuario = %s", (*parametros, id_usuario))
    except UniqueViolation:
        return None
    return await obtener(pg, id_usuario)


async def catalogos(pg) -> dict:
    async with pg.connection() as conexion:
        resultado = {}
        for clave, consulta_sql in {"roles": "SELECT id_rol AS id, nombre, descripcion FROM rol ORDER BY id_rol",
                           "prioridades": "SELECT id_prioridad AS id, nombre, sla_horas FROM prioridad ORDER BY id_prioridad",
                           "estados": "SELECT id_estado AS id, nombre, es_final FROM estado_ticket ORDER BY id_estado"}.items():
            consulta = await conexion.execute(consulta_sql)
            resultado[clave] = [_a_diccionario(consulta, f) for f in await consulta.fetchall()]
        return resultado
