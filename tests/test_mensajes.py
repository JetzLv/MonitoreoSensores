import pytest
from pydantic import ValidationError

from iot_common.mensajes import MensajeLectura
from simulator.app.generador import lectura

BASE = {"sensor_id": "TMP-001", "tipo": "temperatura", "ts": "2026-11-25T18:00:02Z",
        "valores": {"temp_c": 23.4, "humedad_pct": 41.2}}


def test_lectura_valida():
    assert MensajeLectura.model_validate(BASE).valores["temp_c"] == 23.4


@pytest.mark.parametrize("cambio", [
    {"valores": {"temp_c": 300, "humedad_pct": 40}},
    {"valores": {"temp_c": 20}},
    {"tipo": "energia"},
    {"ts": "2026-11-25T18:00:02"},
    {"sensor_id": "XXX-1"},
])
def test_lectura_invalida(cambio):
    with pytest.raises(ValidationError):
        MensajeLectura.model_validate({**BASE, **cambio})


def test_simulador_genera_mensajes_validos_o_rechazables():
    sensor = {"_id": "ENE-001", "tipo": "energia",
              "umbrales": {"voltaje_v": {"min": 114, "max": 140}, "corriente_a": {"min": 0, "max": 15},
                           "potencia_kw": {"min": 0, "max": 2}}}
    validos = 0
    for _ in range(2000):
        mensaje = lectura(sensor)
        if mensaje is None:
            continue
        try:
            MensajeLectura.model_validate(mensaje)
            validos += 1
        except ValidationError:
            pass
    assert validos > 1900
