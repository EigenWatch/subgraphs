FROM grafana/loki:2.9.2

COPY loki-config.yaml /etc/loki/config.yaml

EXPOSE 3100

CMD [ "-config.file=/etc/loki/config.yaml" ]
