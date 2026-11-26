import csv
import io

from fastapi import Response
from fastapi.encoders import jsonable_encoder


def _aplanar(d: dict, prefijo: str = "") -> dict:
    plano = {}
    for k, v in d.items():
        clave = f"{prefijo}{k}"
        if isinstance(v, dict):
            plano.update(_aplanar(v, f"{clave}."))
        else:
            plano[clave] = v
    return plano


def respuesta_csv(filas: list[dict], nombre: str) -> Response:
    filas = [_aplanar(f) for f in jsonable_encoder(filas)]
    columnas = list(dict.fromkeys(k for f in filas for k in f))
    memoria = io.StringIO()
    escritor = csv.DictWriter(memoria, fieldnames=columnas)
    escritor.writeheader()
    escritor.writerows(filas)
    # BOM para que Excel respete los acentos.
    return Response("\ufeff" + memoria.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{nombre}.csv"'})
