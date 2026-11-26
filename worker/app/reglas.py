def severidad(exceso: float) -> str:
    if exceso < 0.10:
        return "media"
    if exceso < 0.25:
        return "alta"
    return "critica"


def evaluar(valores: dict[str, float], umbrales: dict[str, dict]) -> list[dict]:
    alertas = []
    for metrica, valor in valores.items():
        limite = umbrales.get(metrica)
        if not limite:
            continue
        ancho = (limite["max"] - limite["min"]) or 1
        if valor > limite["max"]:
            umbral, exceso = limite["max"], (valor - limite["max"]) / ancho
        elif valor < limite["min"]:
            umbral, exceso = limite["min"], (limite["min"] - valor) / ancho
        else:
            continue
        alertas.append({"metrica": metrica, "valor": valor, "umbral": umbral, "severidad": severidad(exceso)})
    return alertas
