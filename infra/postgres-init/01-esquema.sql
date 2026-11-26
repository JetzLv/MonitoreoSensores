CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE rol (
    id_rol       SMALLINT PRIMARY KEY,
    nombre       VARCHAR(30)  NOT NULL UNIQUE,
    descripcion  VARCHAR(120) NOT NULL
);

CREATE TABLE usuario (
    id_usuario     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre         VARCHAR(80)  NOT NULL,
    correo         VARCHAR(120) NOT NULL UNIQUE,
    hash_password  VARCHAR(255) NOT NULL,
    id_rol         SMALLINT     NOT NULL REFERENCES rol (id_rol),
    activo         BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_usuario_correo CHECK (correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE TABLE prioridad (
    id_prioridad  SMALLINT PRIMARY KEY,
    nombre        VARCHAR(20) NOT NULL UNIQUE,
    sla_horas     SMALLINT    NOT NULL CHECK (sla_horas > 0)
);

CREATE TABLE estado_ticket (
    id_estado  SMALLINT PRIMARY KEY,
    nombre     VARCHAR(20) NOT NULL UNIQUE,
    es_final   BOOLEAN     NOT NULL
);

CREATE TABLE ticket (
    id_ticket       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    folio           VARCHAR(20)  NOT NULL UNIQUE,
    titulo          VARCHAR(120) NOT NULL,
    descripcion     TEXT         NOT NULL,
    sensor_id       VARCHAR(10)  NOT NULL CHECK (sensor_id ~ '^(TMP|ENE|AIR)-[0-9]{3}$'),
    alerta_id       CHAR(24),
    id_prioridad    SMALLINT     NOT NULL REFERENCES prioridad (id_prioridad),
    id_estado       SMALLINT     NOT NULL REFERENCES estado_ticket (id_estado),
    id_creador      INT          NOT NULL REFERENCES usuario (id_usuario),
    id_asignado     INT          REFERENCES usuario (id_usuario),
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    resuelto_en     TIMESTAMPTZ
);

CREATE TABLE historial_ticket (
    id_historial        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_ticket           INT         NOT NULL REFERENCES ticket (id_ticket) ON DELETE CASCADE,
    id_usuario          INT         NOT NULL REFERENCES usuario (id_usuario),
    id_estado_anterior  SMALLINT    REFERENCES estado_ticket (id_estado),
    id_estado_nuevo     SMALLINT    NOT NULL REFERENCES estado_ticket (id_estado),
    comentario          TEXT        NOT NULL DEFAULT '',
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_ticket_estado    ON ticket (id_estado, creado_en DESC);
CREATE INDEX ix_ticket_asignado  ON ticket (id_asignado) WHERE id_asignado IS NOT NULL;
CREATE INDEX ix_ticket_sensor    ON ticket (sensor_id);
CREATE INDEX ix_historial_ticket ON historial_ticket (id_ticket, creado_en);

INSERT INTO rol VALUES
    (1, 'administrador', 'Gestiona usuarios y ve todo el sistema'),
    (2, 'monitorista',   'Vigila sensores, atiende alertas y levanta tickets'),
    (3, 'soporte',       'Resuelve los tickets asignados');

INSERT INTO prioridad VALUES (1, 'baja', 72), (2, 'media', 24), (3, 'alta', 8), (4, 'critica', 2);

INSERT INTO estado_ticket VALUES
    (1, 'abierto', FALSE), (2, 'en_proceso', FALSE), (3, 'resuelto', TRUE), (4, 'cerrado', TRUE);
