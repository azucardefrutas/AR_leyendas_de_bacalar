import { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { getMyLegends } from '../../services/creatorService.js';

function CreatorLegendsPage() {
  const [legends, setLegends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadLegends() {
      const { data, error: legendsError } = await getMyLegends();
      setLegends(data ?? []);
      setError(legendsError);
      setLoading(false);
    }

    loadLegends();
  }, []);

  if (loading) return <LoadingState />;

  return (
    <section className="page-stack">
      <h1>Mis leyendas</h1>
      {error && <p className="error-message">{error.message}</p>}
      {legends.map((legend) => <Card key={legend.id}><h2>{legend.title}</h2><p>{legend.status}</p></Card>)}
    </section>
  );
}

export default CreatorLegendsPage;
