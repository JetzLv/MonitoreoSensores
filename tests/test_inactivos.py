from datetime import datetime, timedelta, timezone

from worker.app.inactivos import cambios

AHORA = datetime(2026, 11, 26, 12, 0, tzinfo=timezone.utc)


def test_detecta_caida_y_recuperacion():
    ultimas = {"TMP-001": AHORA, "TMP-002": AHORA - timedelta(minutes=5)}
    nuevos, recuperados = cambios(ultimas, ["TMP-001", "TMP-002", "TMP-003"], set(), AHORA)
    assert nuevos == {"TMP-002", "TMP-003"} and recuperados == set()

    nuevos, recuperados = cambios({"TMP-002": AHORA}, ["TMP-002"], {"TMP-002"}, AHORA)
    assert nuevos == set() and recuperados == {"TMP-002"}


def test_no_repite_aviso_de_un_sensor_ya_caido():
    nuevos, _ = cambios({}, ["TMP-003"], {"TMP-003"}, AHORA)
    assert nuevos == set()


def test_sensor_dado_de_baja_no_se_reporta_como_recuperado():
    _, recuperados = cambios({}, [], {"TMP-004"}, AHORA)
    assert recuperados == set()
