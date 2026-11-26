#!/bin/sh
set -e
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v usuario_app="$POSTGRES_APP_USER" -v clave_app="$POSTGRES_APP_PASSWORD" \
  -v correo_admin="$ADMIN_CORREO" -v clave_admin="$ADMIN_PASSWORD" <<'SQL'
CREATE ROLE :"usuario_app" LOGIN PASSWORD :'clave_app';
GRANT SELECT ON rol, prioridad, estado_ticket TO :"usuario_app";
GRANT SELECT, INSERT, UPDATE ON usuario, ticket TO :"usuario_app";
GRANT SELECT, INSERT ON historial_ticket TO :"usuario_app";
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO :"usuario_app";

INSERT INTO usuario (nombre, correo, hash_password, id_rol)
VALUES ('Administrador', :'correo_admin', crypt(:'clave_admin', gen_salt('bf', 12)), 1);
SQL
