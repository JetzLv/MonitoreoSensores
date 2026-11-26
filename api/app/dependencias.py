import os
import secrets

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False, description="Requerida en operaciones de escritura")


def get_db(request: Request):
    return request.app.state.db


def requiere_api_key(clave: str | None = Depends(api_key_header)):
    if not clave or not secrets.compare_digest(clave, os.environ["API_KEY"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "API key inválida o ausente")
