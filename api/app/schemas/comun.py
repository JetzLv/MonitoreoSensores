from pydantic import BaseModel


class Error(BaseModel):
    detail: str


def errores(*codigos: int) -> dict:
    return {c: {"model": Error} for c in codigos}
