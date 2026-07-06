import React from 'react';
import CreatorShell from '../components/dashboard/CreatorShell.jsx';
import {
  CodeIcon,
  DashboardIcon,
  DraftIcon,
  LibraryIcon,
  PenIcon,
  ReviewIcon,
  UserIcon,
} from '../components/ui/CreatorIcons.jsx';

const creatorItems = [
  { label: 'Dashboard', to: '/creator', icon: <DashboardIcon />, end: true },
  { label: 'Nueva leyenda', to: '/creator/legends/new', icon: <PenIcon /> },
  { label: 'Mis leyendas', to: '/creator/legends', icon: <LibraryIcon /> },
  { label: 'Borradores', to: '/creator/drafts', icon: <DraftIcon /> },
  { label: 'Revisiones', to: '/creator/reviews', icon: <ReviewIcon /> },
  { label: 'Solicitar codigos', to: '/creator/code-requests', icon: <CodeIcon /> },
  { label: 'Mi perfil', to: '/creator/profile', icon: <UserIcon /> },
];

function CreatorLayout() {
  return <CreatorShell items={creatorItems} />;
}

export default CreatorLayout;
