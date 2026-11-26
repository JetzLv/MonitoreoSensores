import math
import random
from datetime import datetime, timezone

NOMINALES = {
    "temperatura": {"temp_c": (22, 2.5), "humedad_pct": (45, 8)},
    "energia": {"voltaje_v": (127, 3), "corriente_a": (6, 2)},
    "aire": {"pm25": (20, 7), "pm10": (40, 12), "co_ppm": (1.5, 0.6)},
}

PROB_PICO = 0.01
PROB_FUERA_RANGO = 0.002
PROB_MALFORMADO = 0.01
SILENCIOSOS = {"TMP-010", "ENE-010"}


def silencioso(sensor_id: str, ahora: datetime) -> bool:
    return sensor_id in SILENCIOSOS and ahora.minute % 10 < 3


def valores_normales(tipo: str, ahora: datetime) -> dict[str, float]:
    ciclo = math.sin(2 * math.pi * (ahora.hour + ahora.minute / 60) / 24)
    valores = {m: max(0.0, random.gauss(media, sd) + ciclo * sd) for m, (media, sd) in NOMINALES[tipo].items()}
    if tipo == "energia":
        valores["potencia_kw"] = valores["voltaje_v"] * valores["corriente_a"] / 1000
    return valores


def lectura(sensor: dict, ahora: datetime | None = None) -> dict | None:
    ahora = ahora or datetime.now(timezone.utc)
    if silencioso(sensor["_id"], ahora):
        return None
    valores = valores_normales(sensor["tipo"], ahora)
    azar = random.random()
    if azar < PROB_PICO:
        metrica = random.choice(list(sensor["umbrales"]))
        valores[metrica] = sensor["umbrales"][metrica]["max"] * random.uniform(1.05, 1.4)
    elif azar < PROB_PICO + PROB_FUERA_RANGO:
        valores[next(iter(valores))] = 9999
    msg = {"sensor_id": sensor["_id"], "tipo": sensor["tipo"], "ts": ahora.isoformat(), "valores": valores}
    if random.random() < PROB_MALFORMADO:
        msg.pop(random.choice(["tipo", "valores", "ts"]))
    return msg
