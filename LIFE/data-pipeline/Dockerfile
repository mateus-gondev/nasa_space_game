FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY repo/ /app/

RUN python -m pip install --no-cache-dir -r requirements.txt

ENTRYPOINT ["python", "pipeline.py"]
CMD ["--help"]
