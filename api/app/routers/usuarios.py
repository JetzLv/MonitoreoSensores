from fastapi import APIRouter, Depends, HTTPException, status

from ..dependencias import Usuario, autorizar, cualquier_usuario, get_pg
from ..repositories import usuarios as repo
from ..schemas.comun import errores
from ..schemas.gestion import Catalogos, UsuarioActualizar, UsuarioCrear, UsuarioSalida

router = APIRouter(tags=["Usuarios"])
solo_admin = autorizar("administrador")


@router.get("/usuarios", response_model=list[UsuarioSalida], summary="Listar usuarios", responses=errores(401, 403))
async def listar(pg=Depends(get_pg), _=Depends(solo_admin)):
    return await repo.listar(pg)


@router.post("/usuarios", status_code=201, response_model=UsuarioSalida, summary="Crear usuario",
             responses=errores(401, 403, 409))
async def crear(datos: UsuarioCrear, pg=Depends(get_pg), _=Depends(solo_admin)):
    usuario = await repo.crear(pg, datos.model_dump())
    if not usuario:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Ya existe un usuario con el correo {datos.correo}")
    return usuario


@router.patch("/usuarios/{id_usuario}", response_model=UsuarioSalida, summary="Cambiar rol, estado o contraseña",
              responses=errores(401, 403, 404, 422))
async def actualizar(id_usuario: int, datos: UsuarioActualizar, pg=Depends(get_pg), yo: Usuario = Depends(solo_admin)):
    cambios = datos.model_dump(exclude_none=True)
    if not cambios:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Envía rol, activo o password")
    if id_usuario == yo.id and (cambios.get("activo") is False or cambios.get("rol", "administrador") != "administrador"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "No puedes desactivarte ni quitarte el rol de administrador")
    if not await repo.obtener(pg, id_usuario):
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Usuario {id_usuario} no existe")
    return await repo.actualizar(pg, id_usuario, cambios)


@router.get("/catalogos", response_model=Catalogos, summary="Roles, prioridades y estados de ticket",
            responses=errores(401))
async def catalogos(pg=Depends(get_pg), _=Depends(cualquier_usuario)):
    return await repo.catalogos(pg)
