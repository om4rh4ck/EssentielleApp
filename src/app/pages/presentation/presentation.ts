import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-presentation',
  standalone: true,
  imports: [MatIconModule, RouterLink],
  templateUrl: './presentation.html',
})
export class PresentationComponent {
  readonly formations = [
    {
      emoji: '🌸', id: '5',
      title: 'Réflexologie Professionnelle',
      subtitle: 'Oreilles · Pieds · Mains',
      desc: 'Apprenez les techniques de stimulation réflexe permettant d\'accompagner le bien-être général de la personne.',
      items: ['Réflexologie plantaire', 'Réflexologie palmaire', 'Réflexologie auriculaire', 'Protocoles pratiques', 'Études de cas'],
      keywords: 'réflexologie plantaire palmaire auriculaire formation certifiante',
    },
    {
      emoji: '🧠', id: '6',
      title: 'Kinésiologie',
      subtitle: 'Muscles · Articulations · Rééquilibrage',
      desc: 'Comprendre les mécanismes du corps et les techniques de rééquilibrage fonctionnel.',
      items: ['Anatomie fonctionnelle', 'Tests musculaires', 'Mobilité articulaire', 'Rééquilibrage corporel', 'Mise en pratique'],
      keywords: 'kinésiologie formation professionnelle rééquilibrage musculaire',
    },
    {
      emoji: '💆', id: '7',
      title: 'Massage Visage & Cou Anti-Âge',
      subtitle: 'Techniques naturelles de rajeunissement',
      desc: 'Formation dédiée aux techniques naturelles de rajeunissement et d\'entretien du visage.',
      items: ['Massage anti-rides', 'Relaxation musculaire', 'Stimulation circulatoire', 'Techniques liftantes', 'Protocoles professionnels'],
      keywords: 'massage visage anti-âge anti-rides formation esthétique',
    },
    {
      emoji: '🌿', id: '8',
      title: 'Massage Anti-Cellulite & Drainage Lymphatique',
      subtitle: 'Remodelage corporel professionnel',
      desc: 'Formation complète pour l\'accompagnement esthétique et le remodelage corporel.',
      items: ['Drainage lymphatique', 'Massage remodelant', 'Techniques anti-cellulite', 'Post-opératoire', 'Protocoles professionnels'],
      keywords: 'drainage lymphatique massage anti-cellulite remodelage corporel formation',
    },
    {
      emoji: '🩺', id: '9',
      title: 'Soins Infirmiers',
      subtitle: 'Gestes techniques essentiels',
      desc: 'Formation pratique orientée vers les gestes techniques essentiels de soin.',
      items: ['Pansements', 'Techniques de suture', 'Perfusions', 'Hygiène', 'Surveillance des patients'],
      keywords: 'formation soins infirmiers pansement perfusion suture',
    },
    {
      emoji: '👵', id: '10',
      title: 'Aide à la Personne Âgée',
      subtitle: 'Accompagnement et prise en charge',
      desc: 'Accompagnement et prise en charge des personnes âgées ou dépendantes.',
      items: ['Assistance quotidienne', 'Hygiène et confort', 'Prévention des risques', 'Communication adaptée', 'Accompagnement humain'],
      keywords: 'aide personne âgée formation accompagnement dépendance',
    },
    {
      emoji: '🌱', id: '11',
      title: 'Herboristerie & Plantes médicinales',
      subtitle: 'Plantes médicinales et applications',
      desc: 'Découvrez les propriétés des plantes médicinales et leurs applications naturelles.',
      items: ['Botanique', 'Plantes médicinales', 'Préparations naturelles', 'Tisanes et macérations', 'Conseils bien-être'],
      keywords: 'herboristerie plantes médicinales formation naturopathie',
    },
    {
      emoji: '🔥', id: '12',
      title: 'Hijama – Cupping Professionnel',
      subtitle: 'Techniques traditionnelles de ventouses',
      desc: 'Formation complète aux techniques traditionnelles de ventouses professionnelles.',
      items: ['Histoire et principes', 'Types de ventouses', 'Protocoles de pratique', 'Hygiène et sécurité', 'Mise en situation'],
      keywords: 'hijama cupping ventouses formation professionnelle traditionnelle',
    },
    {
      emoji: '🌿', id: '2',
      title: 'Détox Professionnelle Complète',
      subtitle: 'Détoxification naturelle du corps',
      desc: 'Formation innovante basée sur les mécanismes naturels de détoxification de l\'organisme.',
      items: ['Détox perte de poids', 'Détox des émonctoires', 'Détox de la peau', 'Hygiène de vie', 'Protocoles personnalisés'],
      keywords: 'détox professionnelle émonctoires perte de poids formation bien-être',
    },
    {
      emoji: '🥗', id: '1',
      title: 'Nutrition & Pathologies',
      subtitle: 'Accompagnement nutritionnel spécialisé',
      desc: 'Formation spécialisée dans l\'accompagnement nutritionnel et les pathologies courantes.',
      items: ['Bases de la nutrition', 'Troubles digestifs', 'Déséquilibres métaboliques', 'Rééquilibrage alimentaire', 'Protocoles nutritionnels'],
      keywords: 'nutrition spécialisée pathologies formation diététique accompagnement',
    },
  ];

  readonly values = [
    { icon: 'school',         label: 'Excellence pédagogique' },
    { icon: 'favorite',       label: 'Accompagnement humain' },
    { icon: 'public',         label: 'Ouverture internationale' },
    { icon: 'workspace_premium', label: 'Professionnalisation' },
    { icon: 'spa',            label: 'Bien-être et prévention' },
  ];
}
