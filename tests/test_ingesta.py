import asyncio
import json

from worker.app.ingesta import Ingesta


class Coleccion:
    def __init__(self):
        self.docs = []

    async def insert_many(self, docs, ordered=False):
        self.docs.extend(docs)

    async def insert_one(self, doc):
        self.docs.append(doc)
        return type("R", (), {"inserted_id": "64b000000000000000000001"})()


class Exchange:
    def __init__(self):
        self.publicados = []

    async def publish(self, message, routing_key):
        self.publicados.append((routing_key, message))


class Mensaje:
    def __init__(self, cuerpo):
        self.body = json.dumps(cuerpo).encode()
        self.estado = None

    async def ack(self):
        self.estado = "ack"

    async def nack(self, requeue):
        self.estado = "nack"


class DB:
    def __init__(self):
        self.lecturas, self.alertas = Coleccion(), Coleccion()


SENSOR = {"_id": "TMP-001", "tipo": "temperatura", "estado": "activo",
          "ubicacion": {"edificio": "A", "piso": 1, "zona": "Norte"},
          "umbrales": {"temp_c": {"min": 15, "max": 30}, "humedad_pct": {"min": 20, "max": 70}}}


def lectura(temp):
    return {"sensor_id": "TMP-001", "tipo": "temperatura", "ts": "2026-11-25T18:00:02Z",
            "valores": {"temp_c": temp, "humedad_pct": 40}}


def test_flujo_de_ingesta():
    async def correr():
        db, dlx, eventos = DB(), Exchange(), Exchange()
        ing = Ingesta(db, dlx, eventos)
        ing.sensores = {"TMP-001": SENSOR}
        ok, pico, roto = Mensaje(lectura(22)), Mensaje(lectura(33)), Mensaje({"sensor_id": "TMP-001"})
        for m in (ok, pico, roto):
            await ing.recibir(m)
        await ing._vaciar()
        return db, dlx, eventos, (ok, pico, roto)

    db, dlx, eventos, mensajes = asyncio.run(correr())
    assert [m.estado for m in mensajes] == ["ack", "ack", "ack"]
    assert len(db.lecturas.docs) == 2
    assert db.lecturas.docs[0]["meta"] == {"sensor_id": "TMP-001", "tipo": "temperatura", "edificio": "A"}
    assert len(dlx.publicados) == 1
    assert [rk for rk, _ in eventos.publicados] == ["alerta.alta"]
