FROM node:26-bookworm-slim AS build
WORKDIR /app
RUN npm install -g pnpm@10.20.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
FROM nginx:1.29-alpine
COPY --from=build /app/build /usr/share/nginx/sites/kasperrt.me
COPY .build/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
