FROM python:3.12-slim
WORKDIR /srv
COPY worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home appuser
COPY common/iot_common ./iot_common
COPY worker/app ./app
USER appuser
CMD ["python", "-m", "app.main"]
