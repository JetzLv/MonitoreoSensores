import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from pymongo import AsyncMongoClient

from .routers import alertas, health, reportes, sensores

DESCRIPCION = """
API de la plataforma de monitoreo IoT.

- Las operaciones de **lectura** son públicas.
- Las de **escritura** requieren el encabezado `X-API-Key`: usa el botón **Authorize**.
- Los reportes aceptan `formato=csv` para descargar el resultado.
"""

TAGS = [
    {"name": "Sensores", "description": "Catálogo de sensores y sus lecturas"},
    {"name": "Alertas", "description": "Alertas generadas por el worker al rebasar umbrales"},
    {"name": "Reportes", "description": "Reportes calculados con el aggregation pipeline de MongoDB"},
    {"name": "Salud", "description": "Estado de los servicios de infraestructura"},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    cliente = AsyncMongoClient(os.environ["MONGO_URI"], tz_aware=True)
    app.state.db = cliente[os.environ["MONGO_DB"]]
    yield
    await cliente.close()


app = FastAPI(title="Monitoreo de Sensores IoT", version="1.0.0", description=DESCRIPCION,
              openapi_tags=TAGS, lifespan=lifespan)

for router in (sensores.router, alertas.router, reportes.router, health.router):
    app.include_router(router, prefix="/api/v1")
