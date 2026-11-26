from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from ..dependencias import autorizar, cualquier_usuario, obtener_db
from ..repositories import lecturas as repo_lecturas
from ..repositories import sensores as repo
from ..schemas.comun import errores
from ..schemas.lecturas import Lectura
from ..schemas.sensores import Estado, Sensor, SensorActualizar, SensorCrear, Tipo, validar_umbrales

enrutador = APIRouter(prefix="/sensores", tags=["Sensores"], dependencies=[Depends(cualquier_usuario)])
solo_admin = autorizar("administrador")


async def _existente(db, sensor_id: str) -> dict:
    sensor = await repo.obtener(db, sensor_id)
    if not sensor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Sensor {sensor_id} no existe")
    return sensor


@enrutador.post("", status_code=201, response_model=Sensor, summary="Registrar sensor",
             dependencies=[Depends(solo_admin)], responses=errores(401, 403, 409))
async def crear(datos: SensorCrear, db=Depends(obtener_db)):
    sensor = await repo.crear(db, datos.model_dump())
    if not sensor:
        raise HTTPException(status.HTTP_409_CONFLICT, f"El sensor {datos.id} ya existe")
    return sensor


@enrutador.get("", response_model=list[Sensor], summary="Listar sensores con filtros")
async def listar(db=Depends(obtener_db), tipo: Tipo | None = None, estado: Estado | None = None,
                 edificio: str | None = Query(None, max_length=20),
                 saltar: int = Query(0, ge=0), limite: int = Query(50, ge=1, le=100)):
    filtros = {k: v for k, v in {"tipo": tipo, "estado": estado, "ubicacion.edificio": edificio}.items() if v}
    return await repo.listar(db, filtros, saltar, limite)


@enrutador.get("/{sensor_id}", response_model=Sensor, summary="Consultar sensor", responses=errores(401, 404))
async def obtener(sensor_id: str, db=Depends(obtener_db)):
    return await _existente(db, sensor_id)


@enrutador.patch("/{sensor_id}", response_model=Sensor, summary="Actualizar umbrales o estado",
              dependencies=[Depends(solo_admin)], responses=errores(401, 403, 404))
async def actualizar(sensor_id: str, datos: SensorActualizar, db=Depends(obtener_db)):
    sensor = await _existente(db, sensor_id)
    cambios = datos.model_dump(exclude_none=True)
    if not cambios:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Envía umbrales o estado")
    if datos.umbrales is not None:
        try:
            validar_umbrales(sensor["tipo"], datos.umbrales)
        except ValueError as e:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(e))
    return await repo.actualizar(db, sensor_id, cambios)


@enrutador.delete("/{sensor_id}", status_code=204, summary="Baja lógica; conserva su historial",
               dependencies=[Depends(solo_admin)], responses=errores(401, 403, 404))
async def dar_de_baja(sensor_id: str, db=Depends(obtener_db)):
    await _existente(db, sensor_id)
    await repo.actualizar(db, sensor_id, {"estado": "baja"})
    return Response(status_code=204)


@enrutador.get("/{sensor_id}/lecturas", response_model=list[Lectura], summary="Lecturas por rango de fechas",
            description="Sin fechas devuelve la última hora. Orden descendente por fecha.", responses=errores(404))
async def lecturas(sensor_id: str, db=Depends(obtener_db), desde: datetime | None = None, hasta: datetime | None = None,
                   limite: int = Query(500, ge=1, le=5000)):
    await _existente(db, sensor_id)
    hasta = hasta or datetime.now(timezone.utc)
    desde = desde or hasta - timedelta(hours=1)
    return await repo_lecturas.por_rango(db, sensor_id, desde, hasta, limite)


@enrutador.get("/{sensor_id}/lecturas/ultima", response_model=Lectura, summary="Última lectura", responses=errores(404))
async def ultima(sensor_id: str, db=Depends(obtener_db)):
    await _existente(db, sensor_id)
    lectura = await repo_lecturas.ultima(db, sensor_id)
    if not lectura:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"El sensor {sensor_id} no tiene lecturas")
    return lectura
