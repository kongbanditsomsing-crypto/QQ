FROM python:3.10-slim
WORKDIR /app
COPY proxy.py .
RUN pip install requests
CMD ["python", "proxy.py"]