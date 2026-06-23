import React from 'react';

const iconNames = {
  assets: 'perm_media',
  code: 'confirmation_number',
  dashboard: 'space_dashboard',
  draft: 'draft',
  library: 'menu_book',
  pen: 'edit_square',
  published: 'verified',
  review: 'fact_check',
  user: 'account_circle',
};

function CreatorMaterialIcon({ name }) {
  return (
    <span className="material-symbols-rounded creator-icon" aria-hidden="true">
      {iconNames[name] || iconNames.dashboard}
    </span>
  );
}

export function DashboardIcon() {
  return <CreatorMaterialIcon name="dashboard" />;
}

export function PenIcon() {
  return <CreatorMaterialIcon name="pen" />;
}

export function LibraryIcon() {
  return <CreatorMaterialIcon name="library" />;
}

export function DraftIcon() {
  return <CreatorMaterialIcon name="draft" />;
}

export function ReviewIcon() {
  return <CreatorMaterialIcon name="review" />;
}

export function AssetsIcon() {
  return <CreatorMaterialIcon name="assets" />;
}

export function UserIcon() {
  return <CreatorMaterialIcon name="user" />;
}

export function CodeIcon() {
  return <CreatorMaterialIcon name="code" />;
}

export function PublishedIcon() {
  return <CreatorMaterialIcon name="published" />;
}
