from datetime import datetime


async def por_rango(db, sensor_id: str, desde: datetime, hasta: datetime, limite: int) -> list[dict]:
    cursor = (db.lecturas.find({"meta.sensor_id": sensor_id, "ts": {"$gte": desde, "$lte": hasta}},
                               {"_id": 0, "ts": 1, "valores": 1})
              .sort("ts", -1).limit(limite))
    return await cursor.to_list()


async def ultima(db, sensor_id: str) -> dict | None:
    return await db.lecturas.find_one({"meta.sensor_id": sensor_id}, {"_id": 0, "ts": 1, "valores": 1},
                                      sort=[("ts", -1)])
