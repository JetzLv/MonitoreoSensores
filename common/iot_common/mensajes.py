from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

RANGOS_FISICOS = {
    "temperatura": {"temp_c": (-40, 85), "humedad_pct": (0, 100)},
    "energia": {"voltaje_v": (0, 300), "corriente_a": (0, 100), "potencia_kw": (0, 30)},
    "aire": {"pm25": (0, 1000), "pm10": (0, 2000), "co_ppm": (0, 100)},
}


class LecturaMsg(BaseModel):
    sensor_id: str = Field(pattern=r"^(TMP|ENE|AIR)-\d{3}$")
    tipo: Literal["temperatura", "energia", "aire"]
    ts: datetime
    valores: dict[str, float]

    @field_validator("ts")
    @classmethod
    def ts_con_zona(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            raise ValueError("ts debe incluir zona horaria")
        return v

    @model_validator(mode="after")
    def metricas_del_tipo(self):
        rangos = RANGOS_FISICOS[self.tipo]
        if set(self.valores) != set(rangos):
            raise ValueError(f"metricas esperadas para {self.tipo}: {sorted(rangos)}")
        for metrica, valor in self.valores.items():
            minimo, maximo = rangos[metrica]
            if not minimo <= valor <= maximo:
                raise ValueError(f"{metrica}={valor} fuera de rango fisico [{minimo}, {maximo}]")
        return self


class AlertaEvento(BaseModel):
    alerta_id: str
    sensor_id: str
    metrica: str
    valor: float
    umbral: float
    severidad: Literal["media", "alta", "critica"]
