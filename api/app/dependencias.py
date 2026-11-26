import os
import secrets

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False, description="Acceso de servicio con permisos de administrador")
COOKIE = "sesion"


class Usuario(BaseModel):
    id: int
    nombre: str
    correo: str
    rol: str


USUARIO_API_KEY = Usuario(id=0, nombre="Servicio (API key)", correo="", rol="administrador")


def get_db(request: Request):
    return request.app.state.db


def get_pg(request: Request):
    return request.app.state.pg


def get_eventos(request: Request):
    return request.app.state.eventos


async def _usuario_de_sesion(request: Request) -> Usuario | None:
    token = request.cookies.get(COOKIE)
    if not token:
        return None
    try:
        datos = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    async with request.app.state.pg.connection() as con:
        fila = await (await con.execute(
            "SELECT u.id_usuario, u.nombre, u.correo, r.nombre FROM usuario u JOIN rol r USING (id_rol) "
            "WHERE u.id_usuario = %s AND u.activo", (int(datos["sub"]),))).fetchone()
    return Usuario(id=fila[0], nombre=fila[1], correo=fila[2], rol=fila[3]) if fila else None


def autorizar(*roles: str, permitir_api_key: bool = True):
    async def dependencia(request: Request, clave: str | None = Depends(api_key_header)) -> Usuario:
        if permitir_api_key and clave and secrets.compare_digest(clave, os.environ["API_KEY"]):
            return USUARIO_API_KEY
        usuario = await _usuario_de_sesion(request)
        if not usuario:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Inicia sesión para continuar")
        if roles and usuario.rol not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Tu rol no tiene permiso para esta acción")
        return usuario
    return dependencia


cualquier_usuario = autorizar()
solo_sesion = autorizar(permitir_api_key=False)
