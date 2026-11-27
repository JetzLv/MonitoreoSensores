from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Severidad = Literal["media", "alta", "critica"]


class AtencionMasiva(BaseModel):
    ids: list[str] = Field(min_length=1, max_length=200, examples=[["665f1c2e9b1e8a0012345678"]])


class ResultadoAtencion(BaseModel):
    atendidas: int


class SensorReferencia(BaseModel):
    id: str
    tipo: str
    ubicacion: dict


class Alerta(BaseModel):
    id: str
    sensor: SensorReferencia
    metrica: str
    valor: float
    umbral: float
    severidad: Severidad
    estado: Literal["abierta", "atendida"]
    ts_lectura: datetime
    creada_en: datetime
    atendida_en: datetime | None = None
    atendida_por: str | None = None
