from worker.app.reglas import evaluar, severidad

UMBRALES = {"temp_c": {"min": 15, "max": 30}, "humedad_pct": {"min": 20, "max": 70}}


def test_sin_alerta_dentro_de_rango():
    assert evaluar({"temp_c": 22, "humedad_pct": 45}, UMBRALES) == []


def test_alerta_por_encima_con_severidad():
    alertas = evaluar({"temp_c": 31, "humedad_pct": 45}, UMBRALES)
    assert alertas == [{"metrica": "temp_c", "valor": 31, "umbral": 30, "severidad": "media"}]


def test_alerta_por_debajo():
    assert evaluar({"temp_c": 22, "humedad_pct": 12}, UMBRALES)[0]["severidad"] == "alta"


def test_limites_de_severidad():
    assert [severidad(x) for x in (0.0, 0.10, 0.25)] == ["media", "alta", "critica"]
