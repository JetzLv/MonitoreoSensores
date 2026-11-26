from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ResumenHorario(BaseModel):
    sensor_id: str
    hora: datetime
    tipo: str
    n_lecturas: int
    metricas: dict[str, dict[str, float]]


class ConteoUbicacion(BaseModel):
    edificio: str
    severidad: str
    total: int


class AlertasPorUbicacion(BaseModel):
    por_edificio: list[ConteoUbicacion]
    por_severidad: dict[str, int]


class SensorInactivo(BaseModel):
    sensor_id: str
    tipo: str
    ubicacion: dict
    ultima_lectura: datetime | None


class PuntoTendencia(BaseModel):
    ts: datetime
    valor: float
    media_movil: float


class EstadoSensor(BaseModel):
    sensor_id: str
    tipo: str
    ubicacion: dict
    estado: Literal["normal", "alerta", "inactivo", "fuera_de_servicio"]
    ultima_lectura: datetime | None
    valores: dict[str, float] | None
    alertas_abiertas: int
