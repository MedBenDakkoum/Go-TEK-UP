
# ── Étape 1 : installation et compilation ─────────────────────────────
FROM node:22-bookworm-slim AS build

WORKDIR /app

# Dépendances système nécessaires à Prisma
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Configuration réseau npm
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 600000

# Variable temporaire pour la génération Prisma et le build
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

# Copier les fichiers de dépendances
COPY package*.json ./

# IMPORTANT : copier Prisma AVANT npm ci
COPY prisma ./prisma
COPY prisma.config.ts ./

# Installation des dépendances avec cache
RUN --mount=type=cache,target=/root/.npm \
    success=0; \
    for i in 1 2 3 4 5; do \
      if npm ci; then success=1; break; fi; \
      echo "npm ci a échoué (essai $i), nouvel essai..."; \
      sleep 10; \
    done; \
    test "$success" -eq 1

# Copier le reste du projet
COPY . .

# Générer le client Prisma explicitement
RUN npx prisma generate

# Compiler Next.js
RUN npm run build


# ── Étape 2 : image d'exécution ──────────────────────────────────────
FROM node:22-bookworm-slim AS runner

RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build --chown=node:node /app ./

EXPOSE 3000

USER node

# Appliquer les migrations puis démarrer Next.js
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
