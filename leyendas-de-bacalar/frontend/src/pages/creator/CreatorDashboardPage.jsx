import React from 'react';
import Card from '../../components/ui/Card.jsx';
import { useProfile } from '../../hooks/useProfile.js';

function CreatorDashboardPage() {
  const { profile } = useProfile();

  return (
    <section className="page-stack">
      <h1>Dashboard de creador</h1>
      <Card>
        <p>Bienvenido al panel de creacion.</p>
        <pre>{JSON.stringify(profile, null, 2)}</pre>
      </Card>
    </section>
  );
}

export default CreatorDashboardPage;
