import React from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { getLegendBySlug, getLegendPages, getUserLegendAccess } from '../../services/legendService.js';

function LegendDetailPage() {
  const { slug } = useParams();
  const [legend, setLegend] = useState(null);
  const [pages, setPages] = useState([]);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadLegend() {
      const { data, error: legendError } = await getLegendBySlug(slug);
      if (legendError || !data) {
        setError(legendError ?? new Error('Leyenda no encontrada.'));
        setLoading(false);
        return;
      }

      const [{ data: pageData }, { data: accessData }] = await Promise.all([
        getLegendPages(data.id),
        getUserLegendAccess(data.id),
      ]);

      setLegend(data);
      setPages(pageData ?? []);
      setAccess(accessData);
      setLoading(false);
    }

    loadLegend();
  }, [slug]);

  if (loading) return <LoadingState message="Cargando detalle..." />;
  if (error) return <EmptyState title="No se pudo cargar la leyenda" message={error.message} />;

  return (
    <section className="page-stack">
      <Card className="detail-hero">
        <Badge>{access ? 'Desbloqueada' : 'Vista previa'}</Badge>
        <h1>{legend.title}</h1>
        <p>{legend.description ?? legend.short_description}</p>
        <Link to={`/reader/read/${legend.slug}`}>
          <Button disabled={!access}>Leer ahora</Button>
        </Link>
      </Card>
      <Card>
        <h2>Paginas disponibles</h2>
        <p>{pages.length} paginas registradas para esta leyenda.</p>
      </Card>
    </section>
  );
}

export default LegendDetailPage;
