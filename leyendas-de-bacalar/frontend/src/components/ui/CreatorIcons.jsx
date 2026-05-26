import React from 'react';

function IconBase({ children }) {
  return (
    <svg className="creator-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

const iconProps = {
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function DashboardIcon() {
  return (
    <IconBase>
      <rect x="3" y="3" width="7" height="8" rx="2" {...iconProps} />
      <rect x="14" y="3" width="7" height="5" rx="2" {...iconProps} />
      <rect x="14" y="12" width="7" height="9" rx="2" {...iconProps} />
      <rect x="3" y="15" width="7" height="6" rx="2" {...iconProps} />
    </IconBase>
  );
}

export function PenIcon() {
  return (
    <IconBase>
      <path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Z" {...iconProps} />
      <path d="m13.5 6.5 4 4" {...iconProps} />
    </IconBase>
  );
}

export function LibraryIcon() {
  return (
    <IconBase>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" {...iconProps} />
      <path d="M8 7h8M8 11h6" {...iconProps} />
    </IconBase>
  );
}

export function DraftIcon() {
  return (
    <IconBase>
      <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" {...iconProps} />
      <path d="M14 3v5h5M8 13h8M8 17h5" {...iconProps} />
    </IconBase>
  );
}

export function ReviewIcon() {
  return (
    <IconBase>
      <path d="M5 4h14v16H5z" {...iconProps} />
      <path d="m8 12 2.2 2.2L16 8.8M8 17h8" {...iconProps} />
    </IconBase>
  );
}

export function AssetsIcon() {
  return (
    <IconBase>
      <rect x="4" y="5" width="16" height="14" rx="2" {...iconProps} />
      <path d="m7 16 4-4 3 3 2-2 3 3M8 9h.01" {...iconProps} />
    </IconBase>
  );
}

export function UserIcon() {
  return (
    <IconBase>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" {...iconProps} />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" {...iconProps} />
    </IconBase>
  );
}

export function CodeIcon() {
  return (
    <IconBase>
      <path d="M5 7h14v10H5z" {...iconProps} />
      <path d="M8 10h2M8 14h4M16 10h.01M16 14h.01" {...iconProps} />
    </IconBase>
  );
}

export function PublishedIcon() {
  return (
    <IconBase>
      <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" {...iconProps} />
    </IconBase>
  );
}
