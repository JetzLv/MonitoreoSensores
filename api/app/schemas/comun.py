from pydantic import BaseModel


class ErrorRespuesta(BaseModel):
    detail: str


def errores(*codigos: int) -> dict:
    return {c: {"model": ErrorRespuesta} for c in codigos}
