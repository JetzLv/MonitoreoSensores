import os

os.environ.setdefault("MONGO_URI", "mongodb://localhost:1/?serverSelectionTimeoutMS=100")
os.environ.setdefault("MONGO_DB", "prueba")
os.environ.setdefault("RABBITMQ_URL", "amqp://localhost:1/")
os.environ.setdefault("API_KEY", "clave-de-prueba")
os.environ.setdefault("JWT_SECRET", "secreto-de-prueba")

import pytest
from fastapi.testclient import TestClient

from api.app.main import aplicacion

SENSOR = {"id": "TMP-099", "tipo": "temperatura", "ubicacion": {"edificio": "A", "piso": 1, "zona": "Norte"},
          "umbrales": {"temp_c": {"min": 15, "max": 30}, "humedad_pct": {"min": 20, "max": 70}}}
CLAVE = {"X-API-Key": "clave-de-prueba"}


@pytest.fixture(scope="module")
def cliente():
    aplicacion.state.db = aplicacion.state.pg = aplicacion.state.eventos = None
    return TestClient(aplicacion)


def test_swagger_documenta_todos_los_endpoints(cliente):
    esquema = cliente.get("/openapi.json").json()
    operaciones = sum(len(metodos) for metodos in esquema["paths"].values())
    assert operaciones == 33
    assert cliente.get("/docs").status_code == 200


@pytest.mark.parametrize("ruta", ["/api/v1/sensores", "/api/v1/alertas", "/api/v1/tickets", "/api/v1/mensajes",
                                  "/api/v1/reportes/estado-sensores", "/api/v1/usuarios"])
def test_lecturas_requieren_sesion(cliente, ruta):
    assert cliente.get(ruta).status_code == 401


@pytest.mark.parametrize("metodo,ruta,cuerpo", [
    ("patch", "/api/v1/alertas", {"ids": ["665f1c2e9b1e8a0012345678"]}),
    ("patch", "/api/v1/mensajes/leidos", None),
    ("post", "/api/v1/tickets/cierre-masivo", {"folios": ["TK-00001"], "comentario": "Revisado"}),
    ("patch", "/api/v1/usuarios/2", {"nombre": "Rita H."}),
])
def test_acciones_masivas_requieren_sesion(cliente, metodo, ruta, cuerpo):
    assert getattr(cliente, metodo)(ruta, json=cuerpo).status_code == 401


def test_huella_cambia_con_correo_o_contrasena():
    from api.app.dependencias import huella_sesion
    base = huella_sesion("rita@iot.local", "hash-1")
    assert huella_sesion("RITA@iot.local", "hash-1") == base
    assert huella_sesion("rita2@iot.local", "hash-1") != base
    assert huella_sesion("rita@iot.local", "hash-2") != base


def test_cookie_falsa_es_401(cliente):
    cliente.cookies.set("sesion", "token-inventado")
    assert cliente.get("/api/v1/auth/yo").status_code == 401
    cliente.cookies.clear()


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
