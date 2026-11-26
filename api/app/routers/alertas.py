from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..dependencias import get_db, requiere_api_key
from ..repositories import alertas as repo
from ..schemas.alertas import Alerta, AlertaAtender, Severidad
from ..schemas.comun import errores

router = APIRouter(prefix="/alertas", tags=["Alertas"])


@router.get("", response_model=list[Alerta], summary="Listar alertas con filtros")
async def listar(db=Depends(get_db), estado: str | None = Query(None, pattern="^(abierta|atendida)$"),
                 severidad: Severidad | None = None, sensor_id: str | None = Query(None, max_length=10),
                 limite: int = Query(50, ge=1, le=500)):
    filtros = {k: v for k, v in {"estado": estado, "severidad": severidad, "sensor.id": sensor_id}.items() if v}
    return await repo.listar(db, filtros, limite)


@router.patch("/{alerta_id}", response_model=Alerta, summary="Marcar alerta como atendida",
              dependencies=[Depends(requiere_api_key)], responses=errores(401, 404, 409))
async def atender(alerta_id: str, datos: AlertaAtender, db=Depends(get_db)):
    resultado, alerta = await repo.atender(db, alerta_id, datos.atendida_por)
    if resultado == "no_existe":
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Alerta {alerta_id} no existe")
    if resultado == "ya_atendida":
        raise HTTPException(status.HTTP_409_CONFLICT, f"La alerta ya fue atendida por {alerta['atendida_por']}")
    return alerta
