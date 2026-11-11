/**
 * Catalogue des matières TEK-UP (plans d'études officiels 2024-2025).
 *
 * Source : docs/tek-up-study-plans/
 * - GLSI, SSIR, SDIA, DMWM, SE & IoT
 *
 * Chaque entrée correspond à un intitulé de module/cours présent dans les PDF.
 * Les matières générales historiques sont conservées pour les demandes existantes
 * et pour les intitulés transverses (mathématiques, anglais, gestion de projet…).
 * La physique générique, absente des plans d'études, a été retirée.
 */

const COMMON_SUBJECTS = [
  // Matières transverses historiques (compatibilité avec les demandes existantes)
  'Mathématiques',
  'Algorithmique',
  'Programmation web',
  'Bases de données',
  'Réseaux',
  'Anglais',
  'Gestion de projet',
  'Autre',
  // Tronc commun Ingénieur Informatique (3e année)
  "Mathématiques de l'ingénieur",
  'Systèmes logiques',
  'Réseaux IP-1',
  "Système d'exploitation Linux-1",
  'Algorithmique et structure de données',
  'Programmation C',
  'HTML5, CSS3, BootStrap',
  'Systèmes de gestion de bases de données relationnelles',
  'Virtualisation et Cloud',
  'Techniques de communication-1',
  'Communication English-1',
  'Probabilités, Statistiques et Processus aléatoires',
  'Théorie des graphes',
  'Théorie des langages',
  'Réseaux IP-2',
  "Systèmes d'exploitation LINUX-2",
  'Programmation JAVA',
  'Programmation Python',
  'IA générative',
  'Modélisation UML',
  'Gestion de versions décentralisée',
  'Développement web JS/PHP',
  'Techniques de communication-2',
  'Communication English-2',
  "Projet de Fin d'Études",
] as const;

const GLSI_SUBJECTS = [
  'Bases de données avancée',
  'Architecture Logicielle',
  'Approches Agile',
  'Algorithmique avancée et Complexité',
  "Traitement d'images",
  'Spring Boot',
  'Framework PHP Symfony',
  'DevOps 2',
  'Design patterns',
  'Techniques de Communication 3',
  'English communication 3',
  'Conduite de projet',
  'Services Web',
  'Node JS',
  'Angular',
  'Business Intelligence',
  'Recherche opérationnelle',
  'Intelligence artificielle et introduction au machine learning',
  'Big Data',
  'Programmation II : Développement .NET',
  'Développement mobile',
  'Technique de communication-4',
  'English Communication-4',
  'Gestion Financière',
  "Droit de l'entreprise",
  'Projet de développement',
  'Architectures AWS',
  'DevOps 3',
  'Framework Django',
  'Qualité logicielle et Automatisation des tests',
  'Ionic',
  'Web Marketing',
  'Apprentissage et Fouille de données',
  'Machine Learning et deep learning',
  'Management et Entrepreneuriat (startup)',
  'Développement hybride (Flutter)',
  'Réalité virtuelle et animation 3D',
  'Développement iOS',
  'React',
] as const;

const SSIR_SUBJECTS = [
  'Cryptographie appliquée',
  'Blockchain',
  'Cryptographie',
  'Fondamentaux pour la cybersécurité',
  'Architectures AWS',
  'Sécurité des réseaux (1)',
  'Administration des systèmes',
  'Automatisation sous Linux',
  'Administration des systèmes Windows',
  'Sécurité des applications',
  'Python pour la cybersécurité',
  "Assembleur pour la ré-ingénierie",
  'Développement des applications sécurisées',
  'Techniques de communication 3',
  'English Communication 3',
  "Droit d'entreprise",
  'Projet Python',
  'Approches Agiles',
  'Sécurité des réseaux privés et publiques',
  'Les réseaux privés virtuels',
  'Sécurité des réseaux (2)',
  'Sécurité des données',
  'Biométrie et tatouage',
  'Cryptographie quantique',
  'Sécurité des bases de données',
  'Gestion de risques',
  'Analyse des menaces',
  "Test d'intrusion",
  'OWASP',
  'Techniques de communication 4',
  'English Communication 4',
  'Gestion Financière',
  'Conduite de projet',
  'Projet : Sécurité des architectures réseaux',
  "Management de la sécurité de l'information",
  'Plan de continuité (PCA)',
  'Audit selon la norme ISO 2700x',
  'Sécurité des infrastructures et des réseaux émergents',
  'Sécurité des réseaux mobiles',
  "Sécurité de l'internet des objets",
  'Sécurité dans les clouds',
  'SOC',
  "L'art de la protection du secret",
  'CyberOps',
  'Etude des menaces et défense',
  "Détection d'intrusion et gestion des alertes",
  'Les menaces intelligentes',
  'Management et entrepreunariat',
  'DevOps',
  'Machine Learning',
  'Deep Learning',
  'Bigdata',
  'No SQL',
] as const;

const SDIA_SUBJECTS = [
  'Spring Boot',
  'Framework PHP Symfony',
  'Architecture n-tiers avec .NET',
  'Méthodologie de gestion de projets',
  'Bases de données avancées',
  'Data Warehouse : conception et implémentation',
  'Analyse statistique',
  'Inférence statistique',
  'Technique de Communication-3',
  'English communication-3',
  "Droit d'entreprise",
  'Projets de Développement',
  'Data Mining',
  'Séries Temporelles (P2)',
  'Traitements analytiques avec python',
  'Machine Learning (P1)',
  'Big Data (P1)',
  'BD NoSQL (P2)',
  'Programmation R',
  'Méthodes statistiques et Étude de données',
  'Programmation Linéaire',
  'Technique de Communication-4',
  'English communication-4',
  'Gestion Financière',
  'Projet BI',
  'Administration des bases de données',
  'Base de données no SQL',
  'Programmation R Data Science',
  'Programmation python Data Science avancée',
  'Text mining et NLP',
  'Deep learning / tensorflow',
  'BigData',
  'Séries Temporelles',
  'AWS',
  'DevOps',
  'Architecture et programmation parallèle',
  'Optimisation des traitements',
  'Management et entreprenariat',
  'Projet Big Data et deep learning',
] as const;

const DMWM_SUBJECTS = [
  'Développement Android',
  'Responsive Web Design',
  'Javascript avancé',
  'Spring Boot',
  'Introduction au langage C#',
  'Design pattern',
  'Approches Agiles',
  'Services Web',
  'Design et Multimédia UI/UX',
  'Design 2D (Photoshop)',
  'Techniques de Communication 3',
  'Droit des Entreprises',
  'English Communication 3',
  'Projet de développement',
  'Développement iOS',
  'Angular',
  'Express / Mongo DB',
  'Microsoft .Net',
  'DevOps-2',
  'Architectures AWS',
  'Techniques de Communication 4',
  'Gestion Financière',
  'English Communication 4',
  'Gestion de Projets',
  'Développement hybride (Flutter)',
  'Création de jeux vidéo',
  'Big Data',
  'DevOps 3',
  'Machine Learning',
  'Qualité logicielle et automatisation des tests',
  'Web marketing',
  'Management et Entreprenariat',
  'React',
  'Ionic',
  'IoT',
  'Blockchain',
] as const;

const SE_IOT_SUBJECTS = [
  'Développement Android',
  'Développement PHP',
  'Web Service',
  'Protocoles et Services réseaux',
  'Technologies des réseaux Sans fils',
  'Python',
  "Linux pour l'embarqué",
  'Les microcontrôleurs (PIC, STM, Arduino...)',
  'Les DSPs',
  'Méthodes AGILES',
  'Projet Intégré',
  'Techniques de Communication 3',
  'English communication 3',
  "Droit d'entreprise",
  "Circuits d'interfaces",
  'Capteurs et Actionneurs',
  'Systèmes de communications',
  'Dev android avancé',
  'NodeJS / MONGO DB',
  'Sécurité informatique',
  'Circuits programmables (PLA, GAL, CPLD, FPGA...)',
  'Programmation VHDL avancée',
  "Traitement d'images",
  'Modélisation 2D/3D',
  'Gestion de projets (MS Project)',
  'Techniques de Communication 4',
  'English communication 4',
  'Gestion financière',
  'Fondements IoT',
  'Réseaux de capteurs',
  'Système Temps Réel',
  'Intelligence artificielle',
  'Robotique',
  'Codesign',
  'Architectures avancées sur puce',
  'Automates programmables',
  'RLI',
  'Management et entrepreunariat',
] as const;

export const SUBJECT_GROUPS = {
  common: COMMON_SUBJECTS,
  GLSI: GLSI_SUBJECTS,
  SSIR: SSIR_SUBJECTS,
  SDIA: SDIA_SUBJECTS,
  DMWM: DMWM_SUBJECTS,
  'SE & IoT': SE_IOT_SUBJECTS,
} as const;

/** Normalise pour la recherche : insensible à la casse, aux accents et aux ligatures. */
export function normalizeSubject(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/[’‘`´]/g, "'")
    .toLowerCase()
    .trim();
}

const ALL_SUBJECTS = [
  ...SUBJECT_GROUPS.common,
  ...SUBJECT_GROUPS.GLSI,
  ...SUBJECT_GROUPS.SSIR,
  ...SUBJECT_GROUPS.SDIA,
  ...SUBJECT_GROUPS.DMWM,
  ...SUBJECT_GROUPS['SE & IoT'],
];

const seen = new Set<string>();
export const SUBJECTS: readonly string[] = ALL_SUBJECTS.filter((subject) => {
  const key = normalizeSubject(subject);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

/**
 * Recherche partielle insensible à la casse et aux accents.
 * Les correspondances en début d'intitulé sont classées avant les correspondances internes.
 */
export function searchSubjects(query: string, subjects: readonly string[] = SUBJECTS): string[] {
  const needle = normalizeSubject(query);
  if (!needle) return [...subjects];

  return subjects
    .map((subject, index) => ({ subject, index, at: normalizeSubject(subject).indexOf(needle) }))
    .filter((entry) => entry.at >= 0)
    .sort((a, b) => a.at - b.at || a.index - b.index)
    .map((entry) => entry.subject);
}
