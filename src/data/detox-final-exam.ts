const DETOX_FINAL_EXAM_QUESTIONS_RAW = [
  {
    prompt: "Quel est l'objectif principal d'une detox ?",
    options: [
      "Fatiguer l'organisme",
      "Soutenir les mecanismes naturels d'elimination",
      "Supprimer tous les aliments gras",
      "Manger uniquement des fruits",
    ],
    correctIndex: 1,
  },
  {
    prompt: "Quel organe participe a la detoxification naturelle du corps ?",
    options: ["Les cheveux", "Le foie", "Les ongles", "Les dents"],
    correctIndex: 1,
  },
  {
    prompt: "Quelle habitude soutient une detox ?",
    options: ["Dormir peu", "Boire suffisamment d'eau", "Consommer plus de sodas", "Manger rapidement"],
    correctIndex: 1,
  },
  {
    prompt: "Quel peut etre un bienfait d'une detox ?",
    options: ["Fatigue permanente", "Manque d'energie", "Sensation de legerete", "Deshydratation"],
    correctIndex: 2,
  },
  {
    prompt: "Pourquoi personnaliser un plan detox ?",
    options: [
      "Chaque organisme possede des besoins differents",
      "Pour supprimer tous les repas",
      "Pour manger moins definitivement",
      "Pour eviter l'hydratation",
    ],
    correctIndex: 0,
  },
  {
    prompt: "Quel facteur peut favoriser la prise de poids ?",
    options: ["Activite physique reguliere", "Stress chronique", "Bonne hydratation", "Sommeil reparateur"],
    correctIndex: 1,
  },
  {
    prompt: "Quel aliment peut soutenir une alimentation detox minceur ?",
    options: ["Soda", "Produits industriels", "Legumes verts", "Bonbons"],
    correctIndex: 2,
  },
  {
    prompt: "Pourquoi l'activite physique est-elle importante ?",
    options: [
      "Elle favorise la sedentarite",
      "Elle soutient l'energie et le metabolisme",
      "Elle reduit l'hydratation",
      "Elle fatigue les reins",
    ],
    correctIndex: 1,
  },
  {
    prompt: "Quel repas favorise une meilleure satiete ?",
    options: [
      "Produits ultra-transformes",
      "Repas equilibre riche en fibres",
      "Soda uniquement",
      "Sucreries",
    ],
    correctIndex: 1,
  },
  {
    prompt: "Quelle habitude aide a maintenir une perte de poids durable ?",
    options: ["Regularite des bonnes habitudes", "Regimes extremes", "Restriction permanente", "Sauter les repas"],
    correctIndex: 0,
  },
  {
    prompt: "Que sont les emonctoires ?",
    options: ["Des muscles", "Des organes d'elimination", "Des vitamines", "Des hormones"],
    correctIndex: 1,
  },
  {
    prompt: "Quel organe est considere comme le principal filtre du corps ?",
    options: ["Les cheveux", "Le foie", "Les dents", "Les os"],
    correctIndex: 1,
  },
  {
    prompt: "Quel emonctoire participe a l'elimination via les urines ?",
    options: ["Les reins", "Les yeux", "Les muscles", "Les oreilles"],
    correctIndex: 0,
  },
  {
    prompt: "Quel role jouent les intestins ?",
    options: [
      "Produire des os",
      "Digérer et eliminer les dechets",
      "Reguler uniquement le sommeil",
      "Remplacer le foie",
    ],
    correctIndex: 1,
  },
  {
    prompt: "Quel emonctoire participe a l'elimination par la transpiration ?",
    options: ["Les poumons", "La peau", "Les cheveux", "Les dents"],
    correctIndex: 1,
  },
  {
    prompt: "Quel est le role principal du foie ?",
    options: ["Produire des cheveux", "Participer a la detoxification", "Reguler uniquement la respiration", "Produire des os"],
    correctIndex: 1,
  },
  {
    prompt: "Quel signe peut indiquer un foie surcharge ?",
    options: ["Sensation de legerete permanente", "Fatigue", "Exces d'energie", "Hydratation excessive"],
    correctIndex: 1,
  },
  {
    prompt: "Quel aliment soutient le foie ?",
    options: ["Artichaut", "Soda", "Bonbons", "Produits ultra-transformes"],
    correctIndex: 0,
  },
  {
    prompt: "Quelle plante est souvent utilisee pour le foie ?",
    options: ["Chardon-Marie", "Menthe industrielle", "Cafe sucre", "Soda"],
    correctIndex: 0,
  },
  {
    prompt: "Quelle habitude soutient le foie ?",
    options: ["Exces d'alcool", "Mauvaise hydratation", "Alimentation equilibree", "Sedentarite"],
    correctIndex: 2,
  },
  {
    prompt: "Quel est le role principal des reins ?",
    options: [
      "Produire des hormones uniquement",
      "Filtrer le sang et eliminer les dechets",
      "Digérer les aliments",
      "Reguler uniquement la respiration",
    ],
    correctIndex: 1,
  },
  {
    prompt: "Quel signe peut indiquer une surcharge renale ?",
    options: ["Retention d'eau", "Energie excessive", "Respiration profonde", "Digestion rapide"],
    correctIndex: 0,
  },
  {
    prompt: "Quel aliment est riche en eau ?",
    options: ["Concombre", "Bonbons", "Viennoiseries", "Soda"],
    correctIndex: 0,
  },
  {
    prompt: "Quelle plante est souvent utilisee dans les approches drainantes ?",
    options: ["Ortie", "Chocolat", "Cafe sucre", "Soda"],
    correctIndex: 0,
  },
  {
    prompt: "Quelle habitude soutient les reins ?",
    options: ["Limiter fortement l'eau", "Boire regulierement", "Exces de sel", "Sedentarite"],
    correctIndex: 1,
  },
  {
    prompt: "Quel est le role principal des intestins ?",
    options: ["Produire des os", "Digérer et eliminer les dechets", "Filtrer le sang", "Reguler uniquement le sommeil"],
    correctIndex: 1,
  },
  {
    prompt: "Quel signe peut indiquer un intestin desequilibre ?",
    options: ["Ballonnements", "Exces d'energie", "Respiration profonde", "Vision amelioree"],
    correctIndex: 0,
  },
  {
    prompt: "Quel aliment est riche en fibres ?",
    options: ["Brocoli", "Soda", "Bonbons", "Produits industriels"],
    correctIndex: 0,
  },
  {
    prompt: "Que sont les probiotiques ?",
    options: [
      "Des sucres raffines",
      "Des mauvaises bacteries",
      "Des micro-organismes favorisant l'equilibre intestinal",
      "Des colorants alimentaires",
    ],
    correctIndex: 2,
  },
  {
    prompt: "Quelle habitude favorise le confort digestif ?",
    options: ["Bien macher les aliments", "Manger rapidement", "Reduire fortement l'eau", "Augmenter les produits industriels"],
    correctIndex: 0,
  },
  {
    prompt: "Quel est le role principal des poumons ?",
    options: ["Digérer les aliments", "Assurer les echanges respiratoires", "Filtrer le sang", "Produire des hormones"],
    correctIndex: 1,
  },
  {
    prompt: "Quel facteur peut perturber les poumons ?",
    options: ["Air pur", "Activite physique moderee", "Pollution atmospherique", "Hydratation suffisante"],
    correctIndex: 2,
  },
  {
    prompt: "Quelle plante est souvent utilisee pour le confort respiratoire ?",
    options: ["Thym", "Chocolat", "Cafe", "Persil"],
    correctIndex: 0,
  },
  {
    prompt: "Quel exercice favorise la detente respiratoire ?",
    options: ["Respiration profonde", "Sedentarite", "Manque de sommeil", "Exces de sucre"],
    correctIndex: 0,
  },
  {
    prompt: "Quelle habitude soutient les poumons ?",
    options: ["Fumer regulierement", "Bouger quotidiennement", "Eviter les espaces aeres", "Reduire l'hydratation"],
    correctIndex: 1,
  },
  {
    prompt: "Quel est le role principal de la peau ?",
    options: ["Produire des os", "Proteger l'organisme", "Digérer les aliments", "Reguler uniquement le sommeil"],
    correctIndex: 1,
  },
  {
    prompt: "Quel facteur peut perturber l'equilibre de la peau ?",
    options: ["Bonne hydratation", "Sommeil reparateur", "Stress chronique", "Activite physique reguliere"],
    correctIndex: 2,
  },
  {
    prompt: "Quel aliment soutient une peau saine ?",
    options: ["Soda", "Produits industriels", "Fruits rouges", "Bonbons"],
    correctIndex: 2,
  },
  {
    prompt: "Quelle pratique stimule la circulation cutanee ?",
    options: ["Brossage a sec", "Sedentarite", "Manque d'eau", "Manger rapidement"],
    correctIndex: 0,
  },
  {
    prompt: "Quelle habitude favorise l'equilibre de la peau ?",
    options: ["Dormir suffisamment", "Limiter l'eau", "Augmenter les produits industriels", "Reduire les legumes"],
    correctIndex: 0,
  },
  {
    prompt: "Quel est l'objectif principal d'une alimentation detox ?",
    options: ["Se priver totalement", "Soutenir l'equilibre du corps", "Supprimer tous les repas", "Manger uniquement des fruits"],
    correctIndex: 1,
  },
  {
    prompt: "Quel aliment est a privilegier ?",
    options: ["Soda", "Produits ultra-transformes", "Brocoli", "Bonbons"],
    correctIndex: 2,
  },
  {
    prompt: "Pourquoi l'hydratation est-elle importante ?",
    options: [
      "Pour fatiguer l'organisme",
      "Pour soutenir les mecanismes d'elimination",
      "Pour remplacer les repas",
      "Pour reduire les fibres",
    ],
    correctIndex: 1,
  },
  {
    prompt: "Quel aliment est preferable de limiter ?",
    options: ["Fruits frais", "Eau", "Produits industriels", "Legumes verts"],
    correctIndex: 2,
  },
  {
    prompt: "Quel est l'avantage du batch cooking ?",
    options: ["Augmenter le stress", "Gagner du temps et mieux organiser les repas", "Reduire les legumes", "Supprimer les collations"],
    correctIndex: 1,
  },
  {
    prompt: "Pourquoi la reprise alimentaire doit-elle etre progressive ?",
    options: [
      "Pour fatiguer l'organisme",
      "Pour eviter les desequilibres digestifs",
      "Pour supprimer l'hydratation",
      "Pour eviter les legumes",
    ],
    correctIndex: 1,
  },
  {
    prompt: "Quelle habitude est importante apres une detox ?",
    options: ["Reduire fortement l'eau", "Maintenir une bonne hydratation", "Dormir moins", "Supprimer l'activite physique"],
    correctIndex: 1,
  },
  {
    prompt: "Comment gerer un ecart alimentaire ?",
    options: [
      "Avec culpabilite",
      "En arretant toutes les bonnes habitudes",
      "En revenant progressivement a l'equilibre",
      "En sautant plusieurs repas",
    ],
    correctIndex: 2,
  },
  {
    prompt: "Quel element soutient l'energie au quotidien ?",
    options: ["Sedentarite", "Sommeil reparateur", "Stress chronique permanent", "Exces de sucre"],
    correctIndex: 1,
  },
  {
    prompt: "Quel est l'objectif d'un plan d'entretien personnalise ?",
    options: [
      "Imposer une routine identique a tous",
      "Supprimer tous les plaisirs alimentaires",
      "Creer des habitudes adaptees et durables",
      "Reduire l'activite physique",
    ],
    correctIndex: 2,
  },
];

const DETOX_FINAL_ANSWER_KEY = [
  1, 1, 1, 2, 0,
  1, 2, 1, 1, 0,
  1, 1, 0, 1, 1,
  1, 1, 0, 0, 2,
  1, 0, 0, 0, 1,
  1, 0, 0, 2, 0,
  1, 2, 0, 0, 1,
  1, 2, 2, 0, 0,
  1, 2, 1, 2, 1,
  1, 1, 2, 1, 2,
] as const;

export const DETOX_FINAL_EXAM_QUESTIONS = DETOX_FINAL_EXAM_QUESTIONS_RAW.map((question, index) => ({
  ...question,
  correctIndex: DETOX_FINAL_ANSWER_KEY[index] ?? question.correctIndex,
}));
