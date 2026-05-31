import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-voyage',
  standalone: true,
  imports: [MatIconModule, RouterLink],
  templateUrl: './voyage.html',
})
export class VoyageComponent {
  readonly stages = [
    'Bien-être',
    'Soins',
    'Massage',
    'Accompagnement clientèle',
    'Hygiène professionnelle',
    'Organisation d\'un établissement',
  ];

  readonly stageObjectives = [
    { icon: 'trending_up',  text: 'Développer une expérience pratique sur le terrain' },
    { icon: 'corporate_fare', text: 'Comprendre le fonctionnement d\'une structure professionnelle' },
    { icon: 'visibility',   text: 'Observer des professionnels en situation réelle' },
    { icon: 'star',         text: 'Renforcer ses compétences et sa vision du métier' },
  ];

  readonly activities = [
    { icon: 'two_wheeler',    label: 'Sortie en quad' },
    { icon: 'pets',           label: 'Balade à cheval' },
    { icon: 'agriculture',    label: 'Sortie en buggy' },
    { icon: 'directions_car', label: 'Balade en carrosse' },
  ];

  readonly freeTime = [
    'Espaces touristiques',
    'Marchés locaux',
    'Plages',
    'Cafés et lieux de détente',
    'Découverte de l\'environnement local',
  ];

  readonly excursions = [
    'Excursion à Tataouine',
    'Visites de monuments historiques',
    'Découvertes culturelles locales',
    'Activités touristiques additionnelles',
  ];

  readonly objectives = [
    { icon: 'school',        text: 'Associer apprentissage et expérience terrain' },
    { icon: 'business',      text: 'Découvrir le fonctionnement de structures professionnelles privées' },
    { icon: 'self_improvement', text: 'Développer l\'autonomie et la pratique professionnelle' },
    { icon: 'groups',        text: 'Favoriser les échanges humains et culturels' },
    { icon: 'emoji_emotions', text: 'Renforcer la confiance en soi' },
    { icon: 'public',        text: 'Enrichir son parcours par une expérience internationale' },
  ];

  readonly international = [
    'Découvrir de nouvelles méthodes de travail',
    'Élargir ses connaissances professionnelles',
    'Développer son adaptabilité',
    'Enrichir son expérience personnelle et professionnelle',
    'Vivre une expérience humaine unique dans un contexte multiculturel',
  ];
}
