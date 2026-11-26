from datetime import datetime, timedelta, timezone


async def resumen_horario(db, sensor_id: str | None, desde: datetime, hasta: datetime) -> list[dict]:
    filtro = {"_id.hora": {"$gte": desde, "$lte": hasta}}
    if sensor_id:
        filtro["_id.sensor_id"] = sensor_id
    cursor = db.resumen_horario.find(filtro).sort([("_id.hora", -1), ("_id.sensor_id", 1)]).limit(1000)
    return [{"sensor_id": d["_id"]["sensor_id"], "hora": d["_id"]["hora"], "tipo": d["tipo"],
             "n_lecturas": d["n_lecturas"], "metricas": d["metricas"]} async for d in cursor]


async def alertas_por_ubicacion(db, desde: datetime) -> dict:
    cursor = await db.alertas.aggregate([
        {"$match": {"creada_en": {"$gte": desde}}},
        {"$facet": {
            "por_edificio": [
                {"$group": {"_id": {"edificio": "$sensor.ubicacion.edificio", "severidad": "$severidad"}, "total": {"$sum": 1}}},
                {"$project": {"_id": 0, "edificio": "$_id.edificio", "severidad": "$_id.severidad", "total": 1}},
                {"$sort": {"total": -1}},
            ],
            "por_severidad": [{"$group": {"_id": "$severidad", "total": {"$sum": 1}}}],
        }},
    ])
    r = (await cursor.to_list())[0]
    return {"por_edificio": r["por_edificio"], "por_severidad": {x["_id"]: x["total"] for x in r["por_severidad"]}}


async def sensores_inactivos(db, minutos: int) -> list[dict]:
    ahora = datetime.now(timezone.utc)
    cursor = await db.lecturas.aggregate([
        {"$match": {"ts": {"$gte": ahora - timedelta(hours=24)}}},
        {"$group": {"_id": "$meta.sensor_id", "ultima": {"$max": "$ts"}}},
    ])
    ultimas = {d["_id"]: d["ultima"] async for d in cursor}
    limite = ahora - timedelta(minutes=minutos)
    activos = db.sensores.find({"estado": "activo"}, {"tipo": 1, "ubicacion": 1}).sort("_id", 1)
    return [{"sensor_id": s["_id"], "tipo": s["tipo"], "ubicacion": s["ubicacion"], "ultima_lectura": ultimas.get(s["_id"])}
            async for s in activos if ultimas.get(s["_id"]) is None or ultimas[s["_id"]] < limite]


PUNTOS_TENDENCIA = 360


async def tendencia(db, sensor_id: str, metrica: str, horas: int, ventana_min: int) -> list[dict]:
    desde = datetime.now(timezone.utc) - timedelta(hours=horas)
    cursor = await db.lecturas.aggregate([
        {"$match": {"meta.sensor_id": sensor_id, "ts": {"$gte": desde}}},
        {"$setWindowFields": {
            "sortBy": {"ts": 1},
            "output": {"media_movil": {"$avg": f"$valores.{metrica}", "window": {"range": [-ventana_min, 0], "unit": "minute"}}},
        }},
        # Agrupa en ~360 intervalos para que 24 h no envíen 43 mil puntos; mínimo y máximo conservan los picos.
        {"$group": {
            "_id": {"$dateTrunc": {"date": "$ts", "unit": "second", "binSize": max(1, horas * 3600 // PUNTOS_TENDENCIA)}},
            "valor": {"$avg": f"$valores.{metrica}"},
            "minimo": {"$min": f"$valores.{metrica}"},
            "maximo": {"$max": f"$valores.{metrica}"},
            "media_movil": {"$avg": "$media_movil"},
        }},
        {"$sort": {"_id": 1}},
        {"$project": {"_id": 0, "ts": "$_id", "valor": {"$round": ["$valor", 2]}, "minimo": {"$round": ["$minimo", 2]},
                      "maximo": {"$round": ["$maximo", 2]}, "media_movil": {"$round": ["$media_movil", 2]}}},
    ])
    return await cursor.to_list()


async def estado_sensores(db, minutos_inactivo: int = 2) -> list[dict]:
    ahora = datetime.now(timezone.utc)
    cursor = await db.lecturas.aggregate([
        {"$match": {"ts": {"$gte": ahora - timedelta(hours=1)}}},
        {"$group": {"_id": "$meta.sensor_id", "ultima": {"$top": {"sortBy": {"ts": -1}, "output": {"ts": "$ts", "valores": "$valores"}}}}},
    ])
    ultimas = {d["_id"]: d["ultima"] async for d in cursor}
    cursor = await db.alertas.aggregate([{"$match": {"estado": "abierta"}}, {"$group": {"_id": "$sensor.id", "n": {"$sum": 1}}}])
    abiertas = {d["_id"]: d["n"] async for d in cursor}
    limite = ahora - timedelta(minutes=minutos_inactivo)
    resultado = []
    async for s in db.sensores.find({"estado": {"$ne": "baja"}}).sort("_id", 1):
        ultima = ultimas.get(s["_id"])
        if s["estado"] != "activo":
            estado = "fuera_de_servicio"
        elif not ultima or ultima["ts"] < limite:
            estado = "inactivo"
        elif abiertas.get(s["_id"]):
            estado = "alerta"
        else:
            estado = "normal"
        resultado.append({"sensor_id": s["_id"], "tipo": s["tipo"], "ubicacion": s["ubicacion"], "estado": estado,
                          "ultima_lectura": ultima["ts"] if ultima else None, "valores": ultima["valores"] if ultima else None,
                          "alertas_abiertas": abiertas.get(s["_id"], 0)})
    return resultado
