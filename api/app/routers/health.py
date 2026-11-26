import os

import aio_pika
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from ..dependencias import get_db

router = APIRouter(tags=["Salud"])


@router.get("/health", summary="Estado de MongoDB y RabbitMQ",
            responses={503: {"description": "Algún servicio no responde"}})
async def health(db=Depends(get_db)):
    estado = {"mongodb": "ok", "rabbitmq": "ok"}
    try:
        await db.command("ping")
    except Exception:
        estado["mongodb"] = "error"
    try:
        conexion = await aio_pika.connect(os.environ["RABBITMQ_URL"], timeout=3)
        await conexion.close()
    except Exception:
        estado["rabbitmq"] = "error"
    return JSONResponse(estado, status_code=200 if "error" not in estado.values() else 503)
