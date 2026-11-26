import os
from contextlib import asynccontextmanager

import aio_pika
from fastapi import FastAPI, Request
from psycopg_pool import AsyncConnectionPool
from pymongo import AsyncMongoClient

from iot_common import topologia

from .routers import alertas, auth, salud, mensajes, reportes, sensores, tickets, usuarios

DESCRIPCION = """
API de la plataforma de monitoreo IoT.

- **Inicia sesión** con `POST /api/v1/auth/login`: el navegador guarda la sesión y Swagger la usa en las demás pruebas.
- Como alternativa de servicio, el botón **Authorize** acepta la API key, con permisos de administrador.
- Los reportes aceptan `formato=csv` para descargar el resultado.
"""

ETIQUETAS = [
    {"name": "Autenticación", "description": "Inicio y cierre de sesión"},
    {"name": "Sensores", "description": "Catálogo de sensores y sus lecturas (MongoDB)"},
    {"name": "Alertas", "description": "Alertas generadas por el worker al rebasar umbrales (MongoDB)"},
    {"name": "Reportes", "description": "Reportes calculados con el aggregation pipeline de MongoDB"},
    {"name": "Tickets", "description": "Levantamiento y seguimiento de tickets (PostgreSQL)"},
    {"name": "Mensajes", "description": "Bandeja de mensajes entregada por RabbitMQ y guardada en MongoDB"},
    {"name": "Usuarios", "description": "Administración de usuarios y catálogos (PostgreSQL)"},
    {"name": "Salud", "description": "Estado de los servicios de infraestructura"},
]


@asynccontextmanager
async def ciclo_de_vida(aplicacion: FastAPI):
    cliente_mongo = AsyncMongoClient(os.environ["MONGO_URI"], tz_aware=True)
    aplicacion.state.db = cliente_mongo[os.environ["MONGO_DB"]]
    aplicacion.state.pg = AsyncConnectionPool(os.environ["POSTGRES_URI"], min_size=1, max_size=10, open=False)
    await aplicacion.state.pg.open()
    conexion = await aio_pika.connect_robust(os.environ["RABBITMQ_URL"])
    aplicacion.state.eventos = (await topologia.declarar(await conexion.channel()))["eventos"]
    yield
    await conexion.close()
    await aplicacion.state.pg.close()
    await cliente_mongo.close()


aplicacion = FastAPI(title="Monitoreo de Sensores IoT", version="2.0.0", description=DESCRIPCION,
              openapi_tags=ETIQUETAS, lifespan=ciclo_de_vida)


@aplicacion.middleware("http")
async def encabezados_seguridad(peticion: Request, siguiente):
    respuesta = await siguiente(peticion)
    respuesta.headers["X-Content-Type-Options"] = "nosniff"
    respuesta.headers["X-Frame-Options"] = "DENY"
    respuesta.headers["Referrer-Policy"] = "same-origin"
    return respuesta


for enrutador in (auth.enrutador, sensores.enrutador, alertas.enrutador, reportes.enrutador, tickets.enrutador,
               mensajes.enrutador, usuarios.enrutador, salud.enrutador):
    aplicacion.include_router(enrutador, prefix="/api/v1")
