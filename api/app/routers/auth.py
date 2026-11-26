import os
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, Response, status

from ..dependencias import NOMBRE_COOKIE, Usuario, obtener_pg, solo_sesion
from ..repositories import usuarios as repo
from ..schemas.comun import errores
from ..schemas.gestion import InicioSesion, UsuarioSalida

enrutador = APIRouter(prefix="/auth", tags=["Autenticación"])
DURACION = timedelta(hours=8)
MAX_INTENTOS, VENTANA_SEG = 10, 15 * 60
# shortcut: contador en memoria; sirve con una sola instancia de la API. Con varias, usar un almacén compartido.
_intentos: dict[str, deque] = defaultdict(deque)


def _limitar(correo: str):
    ahora, cola = time.monotonic(), _intentos[correo.lower()]
    while cola and ahora - cola[0] > VENTANA_SEG:
        cola.popleft()
    if len(cola) >= MAX_INTENTOS:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Demasiados intentos. Espera 15 minutos.")
    cola.append(ahora)


@enrutador.post("/login", response_model=UsuarioSalida, summary="Iniciar sesión", responses=errores(401, 429))
async def iniciar_sesion(datos: InicioSesion, respuesta: Response, pg=Depends(obtener_pg)):
    _limitar(datos.correo)
    usuario = await repo.autenticar(pg, datos.correo, datos.contrasena)
    if not usuario:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos")
    _intentos.pop(datos.correo.lower(), None)
    ficha = jwt.encode({"sub": str(usuario["id"]), "exp": datetime.now(timezone.utc) + DURACION},
                       os.environ["JWT_SECRET"], algorithm="HS256")
    respuesta.set_cookie(NOMBRE_COOKIE, ficha, max_age=int(DURACION.total_seconds()), httponly=True, samesite="lax",
                        secure=os.environ.get("COOKIE_SECURE", "false") == "true", path="/")
    return usuario


@enrutador.post("/logout", status_code=204, summary="Cerrar sesión")
async def cerrar_sesion(respuesta: Response):
    respuesta.delete_cookie(NOMBRE_COOKIE, path="/")


@enrutador.get("/yo", response_model=UsuarioSalida, summary="Usuario de la sesión actual", responses=errores(401))
async def yo(usuario: Usuario = Depends(solo_sesion)):
    return usuario
