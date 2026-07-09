import React from 'react';
import CreatorShell from '../components/dashboard/CreatorShell.jsx';

const creatorItems = [
  { label: 'Dashboard', to: '/creator', icon: 'dashboard', end: true },
  { label: 'Nueva leyenda', to: '/creator/legends/new', icon: 'note_add' },
  { label: 'Mis leyendas', to: '/creator/legends', icon: 'auto_stories' },
  { label: 'Borradores', to: '/creator/drafts', icon: 'draft' },
  { label: 'Revisiones', to: '/creator/reviews', icon: 'rate_review' },
  { label: 'Solicitar codigos', to: '/creator/code-requests', icon: 'confirmation_number' },
  { label: 'Mi perfil', to: '/creator/profile', icon: 'person' },
];

function CreatorLayout() {
  return <CreatorShell items={creatorItems} />;
}

export default CreatorLayout;
