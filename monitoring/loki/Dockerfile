FROM grafana/loki:2.9.2

USER root
RUN mkdir -p /wal /loki && chown -R loki:loki /wal /loki
USER loki

COPY loki-config.yaml /etc/loki/config.yaml

EXPOSE 3100

CMD [ "-config.file=/etc/loki/config.yaml" ]
