import bcrypt from 'bcryptjs';
import type { PrismaClient } from './prisma/generated/client';

const inDays = (d: number, h = 17) => {
  const t = new Date(Date.now() + 3600e3 + d * 86400e3);
  return `${t.toISOString().slice(0, 10)} ${String(h).padStart(2, '0')}:00`;
};

/** Données de démonstration (comptes, demandes, séances). N'est exécuté que sur une base sans utilisateur. */
export async function seedDemo(prisma: PrismaClient): Promise<void> {
  const admin = bcrypt.hashSync('Admin123!', 10);
  const stud = bcrypt.hashSync('Student123!', 10);
  const user = (name: string, email: string, passwordHash: string, role: 'admin' | 'student', speciality: string, level: string, skills: string) =>
    prisma.user.create({ data: { name, email, passwordHash, role, speciality, level, skills, emailVerified: true } });

  await user('Administrateur', 'admin@campus.tn', admin, 'admin', 'Administration', 'ING5', '');
  const alice = await user('Alice Trabelsi', 'alice@campus.tn', stud, 'student', 'Informatique', 'ING5', 'React, JavaScript, SQL');
  const bob = await user('Bob Mansouri', 'bob@campus.tn', stud, 'student', 'Mathématiques appliquées', 'ING4', 'Algèbre, Probabilités, Algorithmique');
  const chaima = await user('Chaima Gharbi', 'chaima@campus.tn', stud, 'student', 'Réseaux et télécoms', 'ING2', 'Anglais, Réseaux');

  const req = async (authorId: number, title: string, description: string, subject: string, level: string, availability: string, status: 'open' | 'accepted' | 'done') =>
    (await prisma.request.create({ data: { authorId, title, description, subject, level, availability, status } })).id;

  const r1 = await req(chaima.id, 'Comprendre les jointures SQL', 'Je n’arrive pas à distinguer INNER JOIN, LEFT JOIN et FULL JOIN sur les exercices du TD 4. Un exemple guidé m’aiderait beaucoup.', 'Bases de données', 'ING2', 'Mardi et jeudi après 16h', 'open');
  await req(chaima.id, 'Réviser les probabilités conditionnelles', 'Examen dans deux semaines : je cherche quelqu’un pour refaire ensemble les exercices sur Bayes et les arbres de probabilités.', 'Mathématiques', 'ING2', 'Week-end, matin', 'open');
  const r3 = await req(bob.id, 'Hooks React : useEffect en boucle infinie', 'Mon composant se re-rend sans fin avec useEffect. J’aimerais comprendre le tableau de dépendances avec mon code sous les yeux.', 'Programmation web', 'ING4', 'Lundi 18h-20h', 'open');
  const r4 = await req(bob.id, 'Préparer l’oral d’anglais technique', 'Besoin de m’entraîner à présenter mon projet en anglais pendant 10 minutes et d’avoir des retours sur la prononciation.', 'Anglais', 'ING4', 'Mercredi après-midi', 'accepted');
  const r5 = await req(alice.id, 'Complexité des algorithmes de tri', 'Je confonds O(n log n) et O(n²) dans l’analyse du tri fusion et du tri rapide. Quelqu’un pour une séance de révision ?', 'Algorithmique', 'ING3', 'Vendredi 14h', 'done');

  const offer = (requestId: number, helperId: number, message: string, status: 'pending' | 'accepted') =>
    prisma.offer.create({ data: { requestId, helperId, message, status } });
  await offer(r1, alice.id, 'Je travaille beaucoup avec SQL, je peux te montrer des schémas simples avec des exemples concrets.', 'pending');
  await offer(r3, alice.id, 'Je connais bien ce piège, je te montre comment stabiliser les dépendances.', 'pending');
  await offer(r4, chaima.id, 'Je peux jouer le rôle du jury et te faire un retour sur l’anglais.', 'accepted');
  await offer(r5, bob.id, 'Je peux te refaire les preuves de complexité étape par étape.', 'accepted');

  await prisma.review.create({ data: { requestId: r5, reviewerId: alice.id, revieweeId: bob.id, rating: 5, comment: 'Explications très claires, merci !' } });
  await prisma.review.create({ data: { requestId: r5, reviewerId: bob.id, revieweeId: alice.id, rating: 4, comment: 'Étudiante motivée, séance agréable.' } });

  const spam = await req(chaima.id, 'Vends cours payants (hors sujet)', 'Cette demande de démonstration est volontairement signalée pour tester l’espace administrateur.', 'Autre', 'ING1', 'Tout le temps', 'open');
  await prisma.report.create({ data: { requestId: spam, reporterId: bob.id, reason: 'Publicité sans rapport avec l’entraide.' } });

  await prisma.sessionPlan.create({ data: { requestId: r4, proposedBy: chaima.id, startsAt: inDays(3, 15), location: 'Bibliothèque, salle 2', status: 'proposed' } });
  await prisma.message.create({ data: { requestId: r4, senderId: chaima.id, body: 'Bonjour Bob ! Je te propose mercredi à 15h à la bibliothèque, ça te va ?' } });
  const g1 = await prisma.groupSession.create({
    data: { hostId: alice.id, title: 'Révision collective : SQL avant le DS', description: 'On refait ensemble les requêtes des TD 3 et 4 (jointures, agrégats). Apportez vos questions.', subject: 'Bases de données', level: 'ING2', startsAt: inDays(5, 16), location: 'Salle B12', capacity: 8 },
  });
  await prisma.groupMember.create({ data: { sessionId: g1.id, userId: chaima.id } });
  await prisma.notification.create({ data: { userId: bob.id, type: 'plan', message: 'Chaima Gharbi propose une séance pour « Préparer l’oral d’anglais technique ».', link: `/requests/${r4}` } });
  await prisma.notification.create({ data: { userId: alice.id, type: 'group', message: 'Chaima Gharbi a rejoint votre séance « Révision collective : SQL avant le DS ».', link: `/sessions/${g1.id}` } });
}

/** Compte administrateur initial pour un déploiement sans données de démonstration (ADMIN_EMAIL / ADMIN_PASSWORD). */
export async function ensureAdmin(prisma: PrismaClient): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  if (await prisma.user.count({ where: { role: 'admin' } })) return;
  await prisma.user.create({
    data: { name: 'Administrateur', email, passwordHash: bcrypt.hashSync(password, 10), role: 'admin', speciality: 'Administration', level: 'ING5', emailVerified: true },
  });
}

/** Premier démarrage : données de démonstration (sauf SEED_DEMO=false) puis administrateur initial, si la base est vide. */
export async function seedIfEmpty(prisma: PrismaClient): Promise<void> {
  if (await prisma.user.count()) return;
  if (process.env.SEED_DEMO !== 'false') await seedDemo(prisma);
  await ensureAdmin(prisma);
}
