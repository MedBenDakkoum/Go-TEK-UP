# ── Étape 1 : installation et compilation ────────────────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Prisma a besoin d'openssl ; ca-certificates pour les téléchargements HTTPS
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Réseau lent ou instable : plus de tentatives et de patience
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 600000

COPY package*.json ./
# Le cache conserve les paquets déjà reçus : un nouvel essai reprend où il s'est arrêté
RUN --mount=type=cache,target=/root/.npm \
    for i in 1 2 3 4 5; do npm ci && break || { echo "npm ci a échoué (essai $i), nouvel essai…"; sleep 10; }; done \
 && test -d node_modules/next

COPY . .
# Valeur factice : la compilation ne se connecte pas à la base
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npm run build

# ── Étape 2 : image d'exécution ──────────────────────────────────────────────
FROM node:22-bookworm-slim
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app ./
EXPOSE 3000
USER node
# Applique les migrations Prisma, puis démarre Next.js
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]