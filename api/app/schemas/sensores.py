from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from iot_common.mensajes import RANGOS_FISICOS

Tipo = Literal["temperatura", "energia", "aire"]
Estado = Literal["activo", "inactivo", "baja"]
PREFIJOS = {"temperatura": "TMP", "energia": "ENE", "aire": "AIR"}


class Umbral(BaseModel):
    min: float
    max: float

    @model_validator(mode="after")
    def orden(self):
        if self.min >= self.max:
            raise ValueError("min debe ser menor que max")
        return self


class Ubicacion(BaseModel):
    edificio: str = Field(min_length=1, max_length=20, examples=["A"])
    piso: int = Field(ge=0, le=50, examples=[2])
    zona: str = Field(min_length=1, max_length=40, examples=["Servidores"])


def validar_umbrales(tipo: str, umbrales: dict[str, Umbral]):
    esperadas = set(RANGOS_FISICOS[tipo])
    if set(umbrales) != esperadas:
        raise ValueError(f"umbrales para {tipo} deben ser exactamente: {sorted(esperadas)}")


class SensorCrear(BaseModel):
    id: str = Field(pattern=r"^(TMP|ENE|AIR)-\d{3}$", examples=["TMP-011"])
    tipo: Tipo
    ubicacion: Ubicacion
    umbrales: dict[str, Umbral] = Field(examples=[{"temp_c": {"min": 15, "max": 30}, "humedad_pct": {"min": 20, "max": 70}}])

    @model_validator(mode="after")
    def coherencia(self):
        if not self.id.startswith(PREFIJOS[self.tipo]):
            raise ValueError(f"el id de un sensor de {self.tipo} debe iniciar con {PREFIJOS[self.tipo]}")
        validar_umbrales(self.tipo, self.umbrales)
        return self


class SensorActualizar(BaseModel):
    umbrales: dict[str, Umbral] | None = None
    estado: Literal["activo", "inactivo"] | None = None


class Sensor(BaseModel):
    id: str
    tipo: Tipo
    ubicacion: Ubicacion
    umbrales: dict[str, Umbral]
    estado: Estado
    instalado_en: datetime
