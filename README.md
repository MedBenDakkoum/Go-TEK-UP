# CampusConnect

Plateforme d'entraide entre étudiants (Tek-Up University).
Next.js + React · Clean Architecture · Prisma · PostgreSQL.

## Lancer le projet

### Option 1 : tout dans Docker

```bash
cp .env.example .env     # puis éditer le fichier (voir « Configuration »)
docker compose up -d --build
```

Ouvrir **http://localhost:3000**.

### Option 2 : développement local

La base tourne dans Docker, l'application sur votre machine.

```bash
npm install
cp .env.example .env
docker compose up -d db
npm run db:deploy        
npm run dev
```

Ouvrir **http://localhost:3000**.

Au premier démarrage, les données de démonstration sont créées automatiquement.

## Comptes de démonstration

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Étudiant | alice@campus.tn | `Student123!` |
| Administrateur | admin@campus.tn | `Admin123!` |

(`bob@campus.tn` et `chaima@campus.tn` existent aussi, avec le même mot de passe étudiant.)

## Configuration (fichier `.env`)

| Variable | À quoi ça sert |
|---|---|
| `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` | identifiants de la base créée par Docker |
| `DATABASE_URL` | connexion à la base (option 2 seulement) |
| `JWT_SECRET` | secret des sessions : **à générer** (`openssl rand -hex 32`) |
| `APP_URL` | adresse du site (liens des e-mails), `http://localhost:3000` en local |
| `ALLOWED_EMAIL_DOMAINS` | domaines acceptés à l'inscription (vide = tous) |
| `REQUIRE_EMAIL_VERIFICATION` | `false` pour ne pas exiger la confirmation par e-mail |
| `SEED_DEMO` | `true` crée les données de démonstration, `false` en production |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | crée un administrateur (utile avec `SEED_DEMO=false`) |
| `SMTP_*`, `MAIL_FROM` | envoi réel d'e-mails ; vides, ils s'affichent dans la console |

## Commandes utiles

| Action | Commande |
|---|---|
| Voir les journaux | `docker compose logs -f app` |
| Arrêter | `docker compose down` |
| Tout effacer, base comprise | `docker compose down -v` |

## Tests

```bash
npm test              # tout (demande une base de test, voir ci-dessous)
```

Les tests d'intégration **effacent** la base qu'on leur donne. Créez une base dédiée :

```bash
docker compose exec db psql -U postgres -c "CREATE DATABASE campus_test;"
# PowerShell :
$env:TEST_DATABASE_URL = "postgresql://postgres:root@localhost:5433/campus_test"
npm test
```

