CONSULTA_TICKET = """
SELECT t.folio, t.titulo, t.descripcion, t.sensor_id, t.alerta_id, p.nombre AS prioridad, e.nombre AS estado,
       c.nombre AS creador, a.nombre AS asignado, t.creado_en, t.actualizado_en, t.resuelto_en,
       (NOT e.es_final AND now() > t.creado_en + p.sla_horas * INTERVAL '1 hour') AS vencido
FROM ticket t
JOIN prioridad p USING (id_prioridad)
JOIN estado_ticket e USING (id_estado)
JOIN usuario c ON c.id_usuario = t.id_creador
LEFT JOIN usuario a ON a.id_usuario = t.id_asignado
"""


def _a_diccionario(cursor, fila) -> dict:
    return {columna.name: valor for columna, valor in zip(cursor.description, fila)}


async def listar(pg, estado: str | None, asignado_a: int | None, sensor_id: str | None) -> list[dict]:
    condiciones, parametros = [], []
    if estado:
        condiciones.append("e.nombre = %s"); parametros.append(estado)
    if asignado_a:
        condiciones.append("t.id_asignado = %s"); parametros.append(asignado_a)
    if sensor_id:
        condiciones.append("t.sensor_id = %s"); parametros.append(sensor_id)
    clausula_where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""
    async with pg.connection() as conexion:
        consulta = await conexion.execute(f"{CONSULTA_TICKET} {clausula_where} ORDER BY t.creado_en DESC LIMIT 200", parametros)
        return [_a_diccionario(consulta, f) for f in await consulta.fetchall()]


async def obtener(pg, folio: str) -> dict | None:
    async with pg.connection() as conexion:
        consulta = await conexion.execute(f"{CONSULTA_TICKET} WHERE t.folio = %s", (folio,))
        fila = await consulta.fetchone()
        if not fila:
            return None
        ticket = _a_diccionario(consulta, fila)
        consulta = await conexion.execute("""
            SELECT u.nombre AS usuario, ea.nombre AS estado_anterior, en.nombre AS estado_nuevo, h.comentario, h.creado_en
            FROM historial_ticket h
            JOIN ticket t USING (id_ticket)
            JOIN usuario u ON u.id_usuario = h.id_usuario
            LEFT JOIN estado_ticket ea ON ea.id_estado = h.id_estado_anterior
            JOIN estado_ticket en ON en.id_estado = h.id_estado_nuevo
            WHERE t.folio = %s ORDER BY h.creado_en""", (folio,))
        ticket["historial"] = [_a_diccionario(consulta, f) for f in await consulta.fetchall()]
        return ticket


async def crear(pg, datos: dict, id_creador: int) -> str:
    async with pg.connection() as conexion, conexion.transaction():
        id_ticket = (await (await conexion.execute("""
            INSERT INTO ticket (folio, titulo, descripcion, sensor_id, alerta_id, id_prioridad, id_estado, id_creador)
            VALUES ('TMP-' || substr(md5(random()::text), 1, 12), %s, %s, %s, %s,
                    (SELECT id_prioridad FROM prioridad WHERE nombre = %s),
                    (SELECT id_estado FROM estado_ticket WHERE nombre = 'abierto'), %s)
            RETURNING id_ticket""",
            (datos["titulo"], datos["descripcion"], datos["sensor_id"], datos["alerta_id"], datos["prioridad"], id_creador),
        )).fetchone())[0]
        folio = f"TK-{id_ticket:05d}"
        await conexion.execute("UPDATE ticket SET folio = %s WHERE id_ticket = %s", (folio, id_ticket))
        await conexion.execute("""
            INSERT INTO historial_ticket (id_ticket, id_usuario, id_estado_nuevo, comentario)
            VALUES (%s, %s, (SELECT id_estado FROM estado_ticket WHERE nombre = 'abierto'), 'Ticket creado')""",
            (id_ticket, id_creador))
        return folio


async def actualizar(pg, folio: str, estado: str | None, tomar: bool, comentario: str, id_usuario: int) -> tuple[str, int | None]:
    async with pg.connection() as conexion, conexion.transaction():
        fila = await (await conexion.execute("""
            SELECT t.id_ticket, t.id_estado, e.nombre, t.id_creador FROM ticket t JOIN estado_ticket e USING (id_estado)
            WHERE t.folio = %s FOR UPDATE OF t""", (folio,))).fetchone()
        if not fila:
            return "no_existe", None
        id_ticket, id_estado_actual, nombre_actual, id_creador = fila
        if nombre_actual == "cerrado":
            return "cerrado", id_creador
        if estado == "cerrado" and nombre_actual != "resuelto":
            return "sin_resolver", id_creador
        id_estado_nuevo = id_estado_actual
        if estado:
            id_estado_nuevo = (await (await conexion.execute(
                "SELECT id_estado FROM estado_ticket WHERE nombre = %s", (estado,))).fetchone())[0]
        await conexion.execute("""
            UPDATE ticket SET id_estado = %s,
                   id_asignado = CASE WHEN %s THEN %s ELSE id_asignado END,
                   actualizado_en = now(),
                   resuelto_en = CASE WHEN %s IN (SELECT id_estado FROM estado_ticket WHERE es_final) THEN COALESCE(resuelto_en, now()) ELSE NULL END
            WHERE id_ticket = %s""", (id_estado_nuevo, tomar, id_usuario, id_estado_nuevo, id_ticket))
        await conexion.execute("""
            INSERT INTO historial_ticket (id_ticket, id_usuario, id_estado_anterior, id_estado_nuevo, comentario)
            VALUES (%s, %s, %s, %s, %s)""",
            (id_ticket, id_usuario, id_estado_actual, id_estado_nuevo, comentario or ("Ticket tomado" if tomar else "")))
        return "ok", id_creador
