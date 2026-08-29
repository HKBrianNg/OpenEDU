FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src

ENV PYTHONPATH=/app

EXPOSE 8080

CMD ["hypercorn", "src.main:app", "--bind", "0.0.0.0:8080", "--worker-class", "asyncio", "--keep-alive", "65"]