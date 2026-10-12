ARG NODE_BASE_IMAGE=node:22.10.0-alpine
ARG NGINX_BASE_IMAGE=nginx:1.29.8-alpine
FROM ${NODE_BASE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run check:versions && npm run build

FROM ${NGINX_BASE_IMAGE}
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
