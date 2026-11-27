import hashlib
import os
import secrets

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

encabezado_api_key = APIKeyHeader(name="X-API-Key", auto_error=False, description="Acceso de servicio con permisos de administrador")
NOMBRE_COOKIE = "sesion"


class Usuario(BaseModel):
    id: int
    nombre: str
    correo: str
    rol: str


USUARIO_API_KEY = Usuario(id=0, nombre="Servicio (API key)", correo="", rol="administrador")


def huella_sesion(correo: str, hash_password: str) -> str:
    return hashlib.sha256(f"{correo.lower()}|{hash_password}".encode()).hexdigest()[:16]


def obtener_db(peticion: Request):
    return peticion.app.state.db


def obtener_pg(peticion: Request):
    return peticion.app.state.pg


def obtener_eventos(peticion: Request):
    return peticion.app.state.eventos


async def _usuario_de_sesion(peticion: Request) -> Usuario | None:
    ficha = peticion.cookies.get(NOMBRE_COOKIE)
    if not ficha:
        return None
    try:
        datos = jwt.decode(ficha, os.environ["JWT_SECRET"], algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    async with peticion.app.state.pg.connection() as conexion:
        fila = await (await conexion.execute(
            "SELECT u.id_usuario, u.nombre, u.correo, r.nombre, u.hash_password FROM usuario u JOIN rol r USING (id_rol) "
            "WHERE u.id_usuario = %s AND u.activo", (int(datos["sub"]),))).fetchone()
    if not fila or not secrets.compare_digest(datos.get("hu", ""), huella_sesion(fila[2], fila[4])):
        return None
    return Usuario(id=fila[0], nombre=fila[1], correo=fila[2], rol=fila[3])


def autorizar(*roles: str, permitir_api_key: bool = True):
    async def dependencia(peticion: Request, clave: str | None = Depends(encabezado_api_key)) -> Usuario:
        if permitir_api_key and clave and secrets.compare_digest(clave, os.environ["API_KEY"]):
            return USUARIO_API_KEY
        usuario = await _usuario_de_sesion(peticion)
        if not usuario:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Inicia sesión para continuar")
        if roles and usuario.rol not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Tu rol no tiene permiso para esta acción")
        return usuario
    return dependencia


cualquier_usuario = autorizar()
solo_sesion = autorizar(permitir_api_key=False)
