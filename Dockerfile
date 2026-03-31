FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN chmod +x deploy/docker/entrypoint.sh \
  && chown -R node:node /app

USER node

ENV NODE_ENV=production
ENV SIGMA_PORT=5173

EXPOSE 5173

ENTRYPOINT ["/app/deploy/docker/entrypoint.sh"]
