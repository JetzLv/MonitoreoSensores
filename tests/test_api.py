import os

os.environ.setdefault("MONGO_URI", "mongodb://localhost:1/?serverSelectionTimeoutMS=100")
os.environ.setdefault("MONGO_DB", "prueba")
os.environ.setdefault("RABBITMQ_URL", "amqp://localhost:1/")
os.environ.setdefault("API_KEY", "clave-de-prueba")

import pytest
from fastapi.testclient import TestClient

from api.app.main import app

SENSOR = {"id": "TMP-099", "tipo": "temperatura", "ubicacion": {"edificio": "A", "piso": 1, "zona": "Norte"},
          "umbrales": {"temp_c": {"min": 15, "max": 30}, "humedad_pct": {"min": 20, "max": 70}}}
CLAVE = {"X-API-Key": "clave-de-prueba"}


@pytest.fixture(scope="module")
def cliente():
    with TestClient(app) as c:
        yield c


def test_swagger_documenta_14_endpoints(cliente):
    esquema = cliente.get("/openapi.json").json()
    operaciones = sum(len(metodos) for metodos in esquema["paths"].values())
    assert operaciones == 14
    assert cliente.get("/docs").status_code == 200


def test_escritura_sin_api_key_es_401(cliente):
    assert cliente.post("/api/v1/sensores", json=SENSOR).status_code == 401
    assert cliente.post("/api/v1/sensores", json=SENSOR, headers={"X-API-Key": "otra"}).status_code == 401


@pytest.mark.parametrize("cambio", [
    {"id": "ENE-099"},
    {"umbrales": {"temp_c": {"min": 15, "max": 30}}},
    {"umbrales": {"temp_c": {"min": 30, "max": 15}, "humedad_pct": {"min": 20, "max": 70}}},
    {"tipo": "otro"},
])
def test_alta_invalida_es_422(cliente, cambio):
    assert cliente.post("/api/v1/sensores", json={**SENSOR, **cambio}, headers=CLAVE).status_code == 422


def test_csv_aplanado():
    from api.app.csv_util import respuesta_csv
    r = respuesta_csv([{"sensor_id": "TMP-001", "metricas": {"temp_c": {"min": 20.5}}}], "x")
    assert r.body.decode("utf-8").splitlines() == ["﻿sensor_id,metricas.temp_c.min", "TMP-001,20.5"]
