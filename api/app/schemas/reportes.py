from datetime import datetime

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
