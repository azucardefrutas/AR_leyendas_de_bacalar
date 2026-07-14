import React, { useEffect, useState } from 'react';
import { getPublicSystemSettings } from '../../services/backendApiService.js';

// Global system banner: renders the admin-configured maintenance notice and/or
// announcement on every page (mounted above the router). Reads the public settings
// endpoint (no auth). Best-effort: any failure renders nothing, so it can never break
// the app shell. Maintenance takes precedence over the announcement.
export default function SystemBanner() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    let active = true;
    getPublicSystemSettings()
      .then((res) => { if (active) setSettings(res?.settings ?? null); })
      .catch(() => { if (active) setSettings(null); });
    return () => { active = false; };
  }, []);

  if (!settings) return null;

  const maintenance = settings.maintenance || {};
  const announcement = settings.announcement || {};
  const showMaintenance = Boolean(maintenance.enabled);
  const showAnnouncement = Boolean(announcement.enabled) && !showMaintenance;

  if (!showMaintenance && !showAnnouncement) return null;

  return (
    <div className="system-banner-stack" role="status" aria-live="polite">
      {showMaintenance && (
        <div className="system-banner system-banner--maintenance">
          <span className="material-symbols-rounded" aria-hidden="true">construction</span>
          <span>{maintenance.message?.trim() || 'Estamos en mantenimiento. Algunas funciones pueden no estar disponibles.'}</span>
        </div>
      )}
      {showAnnouncement && (
        <div className={`system-banner system-banner--${announcement.type || 'info'}`}>
          <span className="material-symbols-rounded" aria-hidden="true">campaign</span>
          <span>{announcement.message}</span>
        </div>
      )}
    </div>
  );
}
