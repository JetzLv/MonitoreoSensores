from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status

from iot_common.mensajes import RANGOS_FISICOS

from ..csv_util import respuesta_csv
from ..dependencias import get_db
from ..repositories import reportes as repo
from ..repositories import sensores as repo_sensores
from ..schemas.comun import errores
from ..schemas.reportes import AlertasPorUbicacion, PuntoTendencia, ResumenHorario, SensorInactivo

router = APIRouter(prefix="/reportes", tags=["Reportes"])
Formato = Literal["json", "csv"]
CSV = {200: {"content": {"text/csv": {}}, "description": "JSON o CSV según el parámetro formato"}}


@router.get("/resumen-horario", response_model=list[ResumenHorario], responses=CSV,
            summary="Mínimo, máximo y promedio por sensor y hora")
async def resumen_horario(db=Depends(get_db), sensor_id: str | None = Query(None, max_length=10),
                          desde: datetime | None = None, hasta: datetime | None = None, formato: Formato = "json"):
    hasta = hasta or datetime.now(timezone.utc)
    filas = await repo.resumen_horario(db, sensor_id, desde or hasta - timedelta(hours=24), hasta)
    return respuesta_csv(filas, "resumen_horario") if formato == "csv" else filas


@router.get("/alertas-por-ubicacion", response_model=AlertasPorUbicacion, responses=CSV,
            summary="Alertas por edificio y severidad")
async def alertas_por_ubicacion(db=Depends(get_db), horas: int = Query(24, ge=1, le=720), formato: Formato = "json"):
    datos = await repo.alertas_por_ubicacion(db, datetime.now(timezone.utc) - timedelta(hours=horas))
    return respuesta_csv(datos["por_edificio"], "alertas_por_ubicacion") if formato == "csv" else datos


@router.get("/sensores-inactivos", response_model=list[SensorInactivo], responses=CSV,
            summary="Sensores activos sin lecturas en los últimos N minutos")
async def sensores_inactivos(db=Depends(get_db), minutos: int = Query(1, ge=1, le=1440), formato: Formato = "json"):
    filas = await repo.sensores_inactivos(db, minutos)
    return respuesta_csv(filas, "sensores_inactivos") if formato == "csv" else filas


@router.get("/tendencia/{sensor_id}", response_model=list[PuntoTendencia], responses={**CSV, **errores(404, 422)},
            summary="Media móvil de una métrica")
async def tendencia(sensor_id: str, metrica: str, db=Depends(get_db), horas: int = Query(1, ge=1, le=24),
                    ventana_min: int = Query(5, ge=1, le=60), formato: Formato = "json"):
    sensor = await repo_sensores.obtener(db, sensor_id)
    if not sensor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Sensor {sensor_id} no existe")
    if metrica not in RANGOS_FISICOS[sensor["tipo"]]:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT,
                            f"Métricas válidas para {sensor['tipo']}: {sorted(RANGOS_FISICOS[sensor['tipo']])}")
    filas = await repo.tendencia(db, sensor_id, metrica, horas, ventana_min)
    return respuesta_csv(filas, f"tendencia_{sensor_id}") if formato == "csv" else filas
