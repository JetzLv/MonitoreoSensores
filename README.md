# Monitoreo de Sensores IoT

Plataforma de monitoreo IoT con MongoDB (series de tiempo), RabbitMQ y una API REST en FastAPI documentada con Swagger.

## Requisitos

- Docker Desktop con Docker Compose
- Git

## Arranque

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
```

Los servicios `mongo`, `rabbitmq` y `postgres` deben aparecer como `healthy`; `web`, `api`, `worker` y `simulator` como `running`.

| Servicio | URL |
|---|---|
| Interfaz web | http://localhost:8080 |
| Swagger (API) | http://localhost:8000/docs |
| Panel de RabbitMQ | http://localhost:15672 |
| MongoDB | mongodb://localhost:27018 |

PostgreSQL no publica puerto; se consulta con `docker compose exec postgres psql -U gestion_admin -d iot_gestion`.

Los puertos publicados escuchan solo en `127.0.0.1`: no son accesibles desde otros equipos de la red.

## Acceso público con Cloudflare Tunnel

```bash
docker compose --profile tunel up -d
docker compose logs tunel
```

En los logs aparece una dirección `https://<aleatorio>.trycloudflare.com`. Cambia en cada reinicio del túnel.

El túnel expone solo la interfaz web; Swagger, MongoDB, RabbitMQ y PostgreSQL siguen accesibles únicamente desde este equipo. Con el túnel activo usa `COOKIE_SECURE=true` en `.env`.

## Desarrollo de la interfaz

Con la API levantada en Docker:

```bash
cd web
npm ci --ignore-scripts
npm run dev
```

Vite sirve la interfaz en http://localhost:5173 y redirige `/api` a la API.

## Pruebas

```bash
pip install -r api/requirements.txt pytest httpx
pytest
```

## Documentación

- `docs/DISENO.md`: sistema de diseño de la interfaz.
- `docs/diagramas/`: arquitectura, despliegue, DER y clases (fuentes `.dot` y PNG).

## Notas

- Usa contraseñas alfanuméricas en `.env`: van dentro de URIs de conexión.
- Los scripts de `infra/mongo-init` solo se ejecutan cuando el volumen de MongoDB está vacío. Para reinicializar: `docker compose down -v` (borra los datos).
