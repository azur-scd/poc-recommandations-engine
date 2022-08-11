# syntax=docker/dockerfile:1
FROM python:3.10.1-slim-buster
WORKDIR /app
COPY requirements.txt requirements.txt
RUN pip install --upgrade pip
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
#CMD [ "gunicorn", "--bind=0.0.0.0:5000", "wsgi:app"]
RUN echo 1 > /proc/sys/vm/overcommit_memory
CMD gunicorn -b 0.0.0.0:5000 --timeout 0 wsgi:app