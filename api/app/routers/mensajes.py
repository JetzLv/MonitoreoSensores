from fastapi import APIRouter, Depends, HTTPException, Query, status

from iot_common import publicar
from iot_common.mensajes import EventoMensaje, Remitente

from ..dependencias import Usuario, get_db, get_eventos, solo_sesion
from ..repositories import mensajes as repo
from ..schemas.comun import errores
from ..schemas.gestion import Conteo, Mensaje, MensajeCrear

router = APIRouter(prefix="/mensajes", tags=["Mensajes"])


@router.get("", response_model=list[Mensaje], summary="Bandeja de entrada", responses=errores(401))
async def listar(db=Depends(get_db), usuario: Usuario = Depends(solo_sesion), solo_no_leidos: bool = False,
                 limite: int = Query(50, ge=1, le=200)):
    return await repo.listar(db, usuario, solo_no_leidos, limite)


@router.get("/no-leidos", response_model=Conteo, summary="Cantidad de mensajes sin leer", responses=errores(401))
async def no_leidos(db=Depends(get_db), usuario: Usuario = Depends(solo_sesion)):
    return {"total": await repo.no_leidos(db, usuario)}


@router.patch("/{mensaje_id}/leido", status_code=204, summary="Marcar como leído", responses=errores(401, 404))
async def marcar_leido(mensaje_id: str, db=Depends(get_db), usuario: Usuario = Depends(solo_sesion)):
    if not await repo.marcar_leido(db, usuario, mensaje_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mensaje no encontrado")


@router.post("", status_code=202, summary="Enviar mensaje a un rol",
             description="Se publica en RabbitMQ; el worker lo entrega en la bandeja del rol destino.",
             responses=errores(401))
async def enviar(datos: MensajeCrear, eventos=Depends(get_eventos), usuario: Usuario = Depends(solo_sesion)):
    await publicar.mensaje(eventos, EventoMensaje(
        tipo="directo", de=Remitente(tipo="usuario", usuario_id=usuario.id, nombre=usuario.nombre), **datos.model_dump()))
    return {"detail": "Mensaje enviado"}
