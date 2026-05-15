# Configuration Locale - Essenti'elle Santé

## Vue d'ensemble
Ce projet est une application Angular 21 (SSR) avec API Express intégrée.
L'authentification est maintenant branchée sur MySQL (avec fallback mémoire si la DB n'est pas configurée).

## Prérequis
- Node.js 20+
- npm
- MySQL 8+ (local ou distant, ex: Hostinger)

## Installation
```bash
npm install
```

## Configuration MySQL
1. Copiez `.env.example` vers `.env.local` (ou définissez les variables dans votre environnement).
2. Renseignez:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=essentielle_sante
DB_SSL=false
```
3. Exécutez le script SQL:
```sql
database/schema.sql
```
Le serveur accepte aussi les alias `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`,
`MYSQL_PASSWORD`, `MYSQL_DATABASE` et `JWT_SECRET`, ce qui aide sur Hostinger
si ces variables existent deja dans le panel.

## Démarrage
Le script `npm start` lance `ng serve` (port 4200 par défaut).
Pour coller à votre usage actuel en port 3000:
```bash
npx ng serve --port 3000 --host 0.0.0.0
```

## Endpoints API
### Inscription
`POST /api/register`
```json
{
  "name": "Sophie Martin",
  "email": "sophie@email.com",
  "password": "motdepasse123"
}
```

### Connexion
`POST /api/login`
```json
{
  "email": "sophie@email.com",
  "password": "motdepasse123"
}
```

### Cours
`GET /api/courses`

### Stats
`GET /api/stats`

## Comptes de test
Le serveur crée automatiquement ces comptes au démarrage (avec hash sécurisé):
- `admin@lessentielle-sante.site` / `password123`
- `instructor@lessentielle-sante.site` / `password123`
- `student@lessentielle-sante.site` / `password123`

## Flux attendu
- Inscription réussie => connexion automatique => dashboard étudiant
- Connexion admin => `/admin`
- Connexion instructor => `/instructor`
- Connexion student => `/student`

## Déploiement Hostinger/GitHub
1. Créer la base MySQL sur l'hébergeur.
2. Importer `database/schema.sql`.
3. Configurer les variables `DB_*` dans l'environnement serveur.
   Les alias `MYSQL_*` et `JWT_SECRET` sont aussi acceptes par le code.
4. Build puis run SSR (deux options):

**Option A** (recommandée - en utilisant npm start):
```bash
npm run build
npm start
```

**Option B** (compatibilité si Entry File est configuré sur Hostinger):
```bash
npm run build
npm run start:compat
```

Ou lancer directement:
```bash
node dist/app/server/server.mjs
```
