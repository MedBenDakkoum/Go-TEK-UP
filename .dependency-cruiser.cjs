/**
 * Règle de dépendance (Clean Architecture) : les dépendances ne vont que de l'extérieur vers l'intérieur.
 *
 *   domain  ←  application  ←  infrastructure  ←  presentation  ←  app (routage Next.js)
 *                    ↑                                  ui (React) → application (types, schémas), domain
 *
 * Vérifiée par `npm run arch:check` (et par la CI).
 */
const L = { domain: '^src/domain/', application: '^src/application/', infrastructure: '^src/infrastructure/', presentation: '^src/presentation/', ui: '^src/ui/', app: '^src/app/' };

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-depends-on-nothing',
      comment: 'Le domaine (règles métier pures) ne dépend de rien : ni autre couche, ni bibliothèque, ni Node.',
      severity: 'error',
      from: { path: L.domain },
      to: { pathNot: L.domain, dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'domain-no-type-leaks',
      comment: 'Même les types du domaine ne pointent pas vers les couches extérieures.',
      severity: 'error',
      from: { path: L.domain },
      to: { path: [L.application, L.infrastructure, L.presentation, L.ui, L.app] },
    },
    {
      name: 'application-only-depends-on-domain',
      comment: "L'application (cas d'usage, ports) ne dépend que du domaine (et de zod pour valider ses entrées).",
      severity: 'error',
      from: { path: L.application },
      to: { path: [L.infrastructure, L.presentation, L.ui, L.app, '^node_modules/(?!zod)', '^node_modules/@prisma'] },
    },
    {
      name: 'infrastructure-not-on-outer-layers',
      comment: "L'infrastructure implémente les ports de l'application ; elle ne connaît ni HTTP/Next (présentation, app) ni l'interface.",
      severity: 'error',
      from: { path: L.infrastructure },
      to: { path: [L.presentation, L.ui, L.app] },
    },
    {
      name: 'presentation-only-via-composition-root',
      comment: "La présentation n'atteint l'infrastructure que par la racine de composition (container) : jamais Prisma ni un adapter.",
      severity: 'error',
      from: { path: L.presentation },
      to: { path: L.infrastructure, pathNot: '^src/infrastructure/container\\.ts$' },
    },
    {
      name: 'presentation-not-on-ui',
      severity: 'error',
      from: { path: L.presentation },
      to: { path: [L.ui, L.app] },
    },
    {
      name: 'ui-not-on-server-layers',
      comment: "L'interface React ne dépend que du domaine et de l'application (types, schémas) ; jamais de l'infrastructure, de la présentation serveur ou de Prisma.",
      severity: 'error',
      from: { path: L.ui },
      to: { path: [L.infrastructure, L.presentation, L.app, '^node_modules/@prisma', '^node_modules/(pg|bcryptjs|nodemailer|jose)/'] },
    },
    {
      name: 'prisma-only-in-infrastructure',
      comment: 'Prisma est un détail de persistance : seul le code de src/infrastructure peut l\'importer.',
      severity: 'error',
      from: { path: '^src', pathNot: [L.infrastructure] },
      to: { path: ['^node_modules/@prisma', '^node_modules/prisma/', '^src/infrastructure/prisma/'] },
    },
    {
      name: 'app-routes-stay-thin',
      comment: "Le routage Next.js (src/app) n'accède pas aux adapters : il passe par la présentation, l'UI ou le container.",
      severity: 'error',
      from: { path: L.app },
      to: { path: L.infrastructure, pathNot: '^src/infrastructure/container\\.ts$' },
    },
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '^src/infrastructure/prisma/generated' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'require', 'node', 'default', 'types'] },
  },
};
