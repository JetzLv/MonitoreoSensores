from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Severidad = Literal["media", "alta", "critica"]


class SensorRef(BaseModel):
    id: str
    tipo: str
    ubicacion: dict


class Alerta(BaseModel):
    id: str
    sensor: SensorRef
    metrica: str
    valor: float
    umbral: float
    severidad: Severidad
    estado: Literal["abierta", "atendida"]
    ts_lectura: datetime
    creada_en: datetime
    atendida_en: datetime | None = None
    atendida_por: str | None = None


class AlertaAtender(BaseModel):
    atendida_por: str = Field(min_length=1, max_length=60, examples=["Jetz"])
