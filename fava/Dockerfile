FROM python:alpine as builder

RUN apk add --update libxml2-dev libxslt-dev gcc musl-dev g++
RUN pip install --install-option="--prefix=/install" fava

FROM python:alpine

COPY --from=builder /install /usr/local

COPY ./ /usr/local/lib/python3.7/site-packages/fava

ENV BEANCOUNT_FILE ""
ENV FAVA_OPTIONS ""
EXPOSE 5000
CMD fava --host 0.0.0.0 $FAVA_OPTIONS $BEANCOUNT_FILE
