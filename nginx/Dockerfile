FROM nginx:alpine

RUN apk add --no-cache gettext

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
