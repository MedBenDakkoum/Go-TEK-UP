import type { NextConfig } from 'next';

const config: NextConfig = {
  // Paquets Node natifs / CommonJS chargés tels quels côté serveur (non empaquetés).
  serverExternalPackages: ['pg', 'nodemailer', 'bcryptjs'],
  poweredByHeader: false,
};
export default config;
