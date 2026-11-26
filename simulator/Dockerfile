FROM python:3.12-slim
WORKDIR /srv
COPY simulator/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home appuser
COPY common/iot_common ./iot_common
COPY simulator/app ./app
USER appuser
CMD ["python", "-m", "app.main"]
