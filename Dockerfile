FROM node:26-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
FROM nginx:1.29-alpine
COPY --from=build /app/dist /usr/share/nginx/sites/kasperrt.me
COPY .build/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
