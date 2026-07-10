import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../../ui/AppIcon.jsx';
import { getMySubscriptions } from '../../../services/subscriptionService.js';
import { formatDate } from '../../../utils/formatters.js';

// Aviso para suscripciones canceladas que aún conservan acceso hasta ends_at
// (modelo "hasta fin de periodo"). No renderiza nada si no aplica.
function MembershipNotice() {
  const [sub, setSub] = useState(null);

  useEffect(() => {
    let active = true;
    getMySubscriptions().then(({ data }) => {
      if (!active) return;
      const now = Date.now();
      const cancelledValid = (data || []).find(
        (item) => item.status === 'cancelled'
          && item.ends_at
          && new Date(item.ends_at).getTime() > now,
      );
      setSub(cancelledValid || null);
    });
    return () => { active = false; };
  }, []);

  if (!sub) return null;

  return (
    <div className="rx-membership-notice" role="status">
      <span className="rx-membership-notice-icon" aria-hidden="true">
        <AppIcon name="schedule" size={20} filled />
      </span>
      <div className="rx-membership-notice-body">
        <strong>Tu acceso premium termina el {formatDate(sub.ends_at)}</strong>
        <span>Cancelaste la renovacion. Puedes reactivar tu membresia cuando quieras.</span>
      </div>
      <Link to="/reader/subscription" className="rx-membership-notice-cta">Reactivar</Link>
    </div>
  );
}

export default MembershipNotice;
