# Go-TEK-UP

Plateforme d'entraide entre étudiants (Tek-Up University).
Next.js + React · Clean Architecture · Prisma 7 · PostgreSQL 16.

## Prérequis

- Node.js ≥ 20.19 (testé avec Node 24)
- npm
- Docker Desktop (PostgreSQL `postgres:16-alpine`)

## Configuration

Copier `.env.example` vers `.env`, puis générer un secret JWT :

```powershell
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# coller la valeur dans JWT_SECRET
```

Variables principales :

| Variable | Rôle |
|---|---|
| `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` | identifiants de la base créée par Docker (`postgres` / `tekdb` / `TEK_DB` / `5433`) |
| `DATABASE_URL` | connexion de l'application lancée hors Docker : `postgresql://postgres:tekdb@127.0.0.1:5433/TEK_DB` |
| `JWT_SECRET` | secret des sessions : **à générer** |
| `APP_URL` | adresse du site (`http://localhost:3000` en local) |
| `ALLOWED_EMAIL_DOMAINS` | domaines acceptés à l'inscription (vide = tous) |
| `REQUIRE_EMAIL_VERIFICATION` | `false` en local pour ne pas exiger la confirmation par e-mail |
| `SEED_DEMO` | `true` crée les données de démonstration |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | crée un administrateur (utile avec `SEED_DEMO=false`) |
| `SMTP_*`, `MAIL_FROM` | envoi réel d'e-mails ; vides, ils s'affichent dans la console |

> `.env` n'est jamais commité. Le secret JWT ne doit pas être partagé.

## Lancer le projet

### Option 1 : tout dans Docker

```powershell
docker compose up -d --build
```

### Option 2 : développement local (recommandé)

La base tourne dans Docker, l'application sur la machine.

```powershell
npm install
docker compose up -d db
npx prisma generate
npx prisma migrate deploy
npm run db:seed      # facultatif : données de démonstration
npm run dev
```

Ouvrir **http://localhost:3000**.

> Au démarrage, l'application crée aussi les données de démonstration si la base est vide
> (`SEED_DEMO=true`). Le planificateur de rappels démarre automatiquement.

## Comptes de démonstration

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Étudiant | alice@campus.tn | `Student123!` |
| Administrateur | admin@campus.tn | `Admin123!` |

(`bob@campus.tn` et `chaima@campus.tn` existent aussi, avec le même mot de passe étudiant.)

## Dépannage : port 5433 déjà utilisé

Si `npx prisma migrate deploy` échoue avec `P1000: Authentication failed`, vérifier qu'aucun
PostgreSQL natif n'écoute sur `5433` en plus du conteneur :

```powershell
Get-NetTCPConnection -LocalPort 5433
Get-Service *postgres*
```

Deux serveurs peuvent se lier au même port sous Windows ; les connexions `127.0.0.1:5433`
peuvent alors atteindre le mauvais serveur. Arrêter le service natif (dans un terminal
administrateur) :

```powershell
Stop-Service postgresql-x64-18
```

Vérifier ensuite la connexion réellement utilisée par Prisma :

```powershell
npx prisma migrate status
```

## Commandes utiles

| Action | Commande |
|---|---|
| Journaux Docker | `docker compose logs -f app` |
| Statut des migrations | `npx prisma migrate status` |
| Arrêter les conteneurs | `docker compose down` |
| Vérifier les types | `npm run typecheck` |
| Règles d'architecture | `npm run arch:check` |
| Build de production | `npm run build` |

## Tests

Les tests d'intégration **effacent** la base qu'on leur donne. Créer une base dédiée :

```powershell
docker compose exec db psql -U postgres -c "CREATE DATABASE TEK_DB_TEST;"
$env:TEST_DATABASE_URL = "postgresql://postgres:tekdb@127.0.0.1:5433/TEK_DB_TEST"
npm test
```

Sans `TEST_DATABASE_URL`, les tests d'intégration utilisent `TEK_DB_TEST` par défaut.
