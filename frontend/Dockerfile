FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.28-alpine

RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/certs && \
    chown -R nginx:nginx /etc/nginx/certs

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY --from=build /app/dist /usr/share/nginx/html
RUN chmod 755 /usr/local/bin/docker-entrypoint.sh && \
    chown -R nginx:nginx /var/cache/nginx /var/run /usr/share/nginx/html

EXPOSE 8443

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-check-certificate --quiet --spider https://127.0.0.1:8443/ || exit 1

USER nginx
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
