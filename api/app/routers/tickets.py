from fastapi import APIRouter, Depends, HTTPException, Query, status

from iot_common import publicar
from iot_common.mensajes import EventoMensaje, Remitente

from ..dependencias import Usuario, autorizar, get_db, get_eventos, get_pg, solo_sesion
from ..repositories import sensores as repo_sensores
from ..repositories import tickets as repo
from ..schemas.comun import errores
from ..schemas.gestion import EstadoTicket, Ticket, TicketActualizar, TicketCrear

router = APIRouter(prefix="/tickets", tags=["Tickets"])


def _remitente(u: Usuario) -> Remitente:
    return Remitente(tipo="usuario", usuario_id=u.id, nombre=u.nombre)


@router.get("", response_model=list[Ticket], summary="Listar tickets", responses=errores(401))
async def listar(pg=Depends(get_pg), usuario: Usuario = Depends(solo_sesion), estado: EstadoTicket | None = None,
                 asignados_a_mi: bool = False, sensor_id: str | None = Query(None, max_length=10)):
    return await repo.listar(pg, estado, usuario.id if asignados_a_mi else None, sensor_id)


@router.get("/{folio}", response_model=Ticket, summary="Detalle con historial", responses=errores(401, 404))
async def obtener(folio: str, pg=Depends(get_pg), _=Depends(solo_sesion)):
    ticket = await repo.obtener(pg, folio)
    if not ticket:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Ticket {folio} no existe")
    return ticket


@router.post("", status_code=201, response_model=Ticket, summary="Levantar ticket", responses=errores(401, 403, 404))
async def crear(datos: TicketCrear, pg=Depends(get_pg), db=Depends(get_db), eventos=Depends(get_eventos),
                usuario: Usuario = Depends(autorizar("monitorista", "administrador", permitir_api_key=False))):
    if not await repo_sensores.obtener(db, datos.sensor_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Sensor {datos.sensor_id} no existe")
    folio = await repo.crear(pg, datos.model_dump(), usuario.id)
    await publicar.mensaje(eventos, EventoMensaje(
        tipo="ticket_creado", para_rol="soporte", de=_remitente(usuario),
        referencia={"ticket_folio": folio, "sensor_id": datos.sensor_id},
        asunto=f"{folio}: {datos.titulo}", cuerpo=f"Prioridad {datos.prioridad}. {datos.descripcion}"))
    return await repo.obtener(pg, folio)


@router.patch("/{folio}", response_model=Ticket, summary="Cambiar estado o tomar ticket",
              description="Soporte y administrador cambian estados y toman tickets. "
                          "El monitorista solo puede cerrar un ticket resuelto.",
              responses=errores(401, 403, 404, 409, 422))
async def actualizar(folio: str, datos: TicketActualizar, pg=Depends(get_pg), eventos=Depends(get_eventos),
                     usuario: Usuario = Depends(autorizar("soporte", "administrador", "monitorista", permitir_api_key=False))):
    if not datos.estado and not datos.tomar:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Envía un estado nuevo o tomar=true")
    if usuario.rol == "monitorista" and (datos.tomar or datos.estado != "cerrado"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "El monitorista solo puede cerrar tickets resueltos")
    resultado, id_creador = await repo.actualizar(pg, folio, datos.estado, datos.tomar, datos.comentario, usuario.id)
    if resultado == "no_existe":
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Ticket {folio} no existe")
    if resultado == "cerrado":
        raise HTTPException(status.HTTP_409_CONFLICT, f"El ticket {folio} ya está cerrado")
    if resultado == "sin_resolver":
        raise HTTPException(status.HTTP_409_CONFLICT, "Solo se puede cerrar un ticket resuelto")
    ticket = await repo.obtener(pg, folio)
    await publicar.mensaje(eventos, EventoMensaje(
        tipo="ticket_actualizado", para_usuario=id_creador, de=_remitente(usuario),
        referencia={"ticket_folio": folio, "sensor_id": ticket["sensor_id"]},
        asunto=f"{folio} ahora está {ticket['estado'].replace('_', ' ')}",
        cuerpo=datos.comentario or f"{usuario.nombre} actualizó el ticket."))
    return ticket
