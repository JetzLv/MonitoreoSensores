from datetime import datetime

from pydantic import BaseModel


class Lectura(BaseModel):
    ts: datetime
    valores: dict[str, float]
