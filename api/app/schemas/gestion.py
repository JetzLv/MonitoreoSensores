from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Rol = Literal["administrador", "monitorista", "soporte"]
EstadoTicket = Literal["abierto", "en_proceso", "resuelto", "cerrado"]
PrioridadTicket = Literal["baja", "media", "alta", "critica"]
CORREO = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class InicioSesion(BaseModel):
    correo: str = Field(pattern=CORREO, max_length=120, examples=["admin@iot.local"])
    contrasena: str = Field(min_length=1, max_length=128)


class UsuarioSalida(BaseModel):
    id: int
    nombre: str
    correo: str
    rol: Rol
    activo: bool = True


class UsuarioCrear(BaseModel):
    nombre: str = Field(min_length=2, max_length=80, examples=["Rita Hernández"])
    correo: str = Field(pattern=CORREO, max_length=120, examples=["rita@iot.local"])
    contrasena: str = Field(min_length=10, max_length=128)
    rol: Rol


class UsuarioActualizar(BaseModel):
    rol: Rol | None = None
    activo: bool | None = None
    contrasena: str | None = Field(None, min_length=10, max_length=128)


class Catalogos(BaseModel):
    roles: list[dict]
    prioridades: list[dict]
    estados: list[dict]


class TicketCrear(BaseModel):
    titulo: str = Field(min_length=5, max_length=120, examples=["TMP-010 sin lecturas"])
    descripcion: str = Field(min_length=5, max_length=2000)
    sensor_id: str = Field(pattern=r"^(TMP|ENE|AIR)-\d{3}$", examples=["TMP-010"])
    alerta_id: str | None = Field(None, pattern=r"^[0-9a-f]{24}$")
    prioridad: PrioridadTicket = "media"


class TicketActualizar(BaseModel):
    estado: EstadoTicket | None = None
    tomar: bool = Field(False, description="Asigna el ticket a quien hace la petición")
    comentario: str = Field("", max_length=2000)


class Historial(BaseModel):
    usuario: str
    estado_anterior: str | None
    estado_nuevo: str
    comentario: str
    creado_en: datetime


class Ticket(BaseModel):
    folio: str
    titulo: str
    descripcion: str
    sensor_id: str
    alerta_id: str | None
    prioridad: PrioridadTicket
    estado: EstadoTicket
    creador: str
    asignado: str | None
    creado_en: datetime
    actualizado_en: datetime
    resuelto_en: datetime | None
    vencido: bool
    historial: list[Historial] | None = None


class MensajeCrear(BaseModel):
    para_rol: Rol
    asunto: str = Field(min_length=3, max_length=120)
    cuerpo: str = Field(min_length=1, max_length=2000)
    referencia: dict[str, str] = Field(default_factory=dict, examples=[{"sensor_id": "TMP-010"}])


class Mensaje(BaseModel):
    id: str
    tipo: str
    asunto: str
    cuerpo: str
    para_rol: str | None
    de: dict
    referencia: dict
    leido: bool
    creado_en: datetime


class Conteo(BaseModel):
    total: int
