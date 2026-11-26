#!/bin/sh
set -e
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v app_user="$POSTGRES_APP_USER" -v app_pass="$POSTGRES_APP_PASSWORD" \
  -v admin_correo="$ADMIN_CORREO" -v admin_pass="$ADMIN_PASSWORD" <<'SQL'
CREATE ROLE :"app_user" LOGIN PASSWORD :'app_pass';
GRANT SELECT ON rol, prioridad, estado_ticket TO :"app_user";
GRANT SELECT, INSERT, UPDATE ON usuario, ticket TO :"app_user";
GRANT SELECT, INSERT ON historial_ticket TO :"app_user";
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO :"app_user";

INSERT INTO usuario (nombre, correo, hash_password, id_rol)
VALUES ('Administrador', :'admin_correo', crypt(:'admin_pass', gen_salt('bf', 12)), 1);
SQL
