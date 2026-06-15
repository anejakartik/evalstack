FROM python:3.11-slim

WORKDIR /app

# Install SDK + server deps
COPY sdk/ /app/sdk/
COPY server/requirements.txt /app/server/requirements.txt
RUN pip install --no-cache-dir -e /app/sdk \
 && pip install --no-cache-dir -r /app/server/requirements.txt

COPY server/ /app/server/

WORKDIR /app/server

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
