import React from 'react';
import { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { getCreatorApplications } from '../../services/adminService.js';

function AdminCreatorApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadApplications() {
      const { data, error: applicationsError } = await getCreatorApplications();
      setApplications(data ?? []);
      setError(applicationsError);
      setLoading(false);
    }

    loadApplications();
  }, []);

  if (loading) return <LoadingState />;

  return (
    <section className="page-stack">
      <h1>Solicitudes de creador</h1>
      {error && <p className="error-message">{error.message}</p>}
      {applications.map((application) => (
        <Card key={application.id}>
          <h2>{application.status}</h2>
          <p>{application.reason}</p>
        </Card>
      ))}
    </section>
  );
}

export default AdminCreatorApplicationsPage;
