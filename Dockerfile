FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html

RUN rm -f /usr/share/nginx/html/Dockerfile \
    /usr/share/nginx/html/.dockerignore \
    /usr/share/nginx/html/nginx.conf \
    /usr/share/nginx/html/package.json \
    /usr/share/nginx/html/server.js \
    /usr/share/nginx/html/vite.config.js \
    && rm -rf /usr/share/nginx/html/.git \
    /usr/share/nginx/html/test

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
