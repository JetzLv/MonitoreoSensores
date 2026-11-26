# Monitoreo de Sensores IoT

Plataforma de monitoreo IoT con MongoDB (series de tiempo), RabbitMQ y una API REST en FastAPI documentada con Swagger.

## Requisitos

- Docker Desktop con Docker Compose
- Git

## Arranque

```bash
cp .env.example .env
docker compose up -d
docker compose ps
```

Los servicios `mongo` y `rabbitmq` deben aparecer como `healthy`.

| Servicio | URL |
|---|---|
| Panel de RabbitMQ | http://localhost:15672 |
| MongoDB | mongodb://localhost:27017 |

## Notas

- Usa contraseñas alfanuméricas en `.env`: van dentro de URIs de conexión.
- Los scripts de `infra/mongo-init` solo se ejecutan cuando el volumen de MongoDB está vacío. Para reinicializar: `docker compose down -v` (borra los datos).
