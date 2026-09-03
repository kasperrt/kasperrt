# syntax=docker/dockerfile:1

ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
RUN npm install -g npm@12.0.2 pnpm@10.20.0 --force
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:1.31.5-alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
