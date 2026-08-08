FROM python:3.10-slim
WORKDIR /app
COPY proxy.py .
CMD ["python", "proxy.py"]