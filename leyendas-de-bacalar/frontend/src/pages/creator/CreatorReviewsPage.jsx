import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatorLegendCard from '../../components/creator/CreatorLegendCard.jsx';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import {
  getCreatorLegendCardData,
  getCreatorLegendStatusKey,
  getCreatorLegends,
} from '../../services/creatorService.js';

const REVIEW_STATUSES = ['in_review', 'review', 'pending_review', 'submitted', 'changes_requested', 'rejected', 'approved', 'published'];

function CreatorReviewsPage() {
  const navigate = useNavigate();
  const [legends, setLegends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadReviews() {
      const { data, error: reviewsError } = await getCreatorLegends();
      setLegends((data ?? []).filter((legend) => REVIEW_STATUSES.includes(getCreatorLegendStatusKey(legend))));
      setError(reviewsError);
      setLoading(false);
    }

    loadReviews();
  }, []);

  function openEditor(legend) {
    if (!legend?.id) {
      setError(new Error('No pudimos abrir esta leyenda.'));
      return;
    }
    navigate(`/creator/legends/${legend.id}/edit`);
  }

  if (loading) return <LoadingState message="Cargando revisiones..." />;

  return (
    <section className="page-stack creator-panel">
      <div className="page-heading-row">
        <div>
          <p className="creator-kicker">Seguimiento editorial</p>
          <h1>Revisiones</h1>
        </div>
      </div>

      {error && <p className="error-message">{error.message}</p>}

      {legends.length === 0 ? (
        <Card className="creator-empty-card">
          <h2>Sin revisiones activas</h2>
          <p>Cuando envies una leyenda a revision, su estado y feedback apareceran aqui.</p>
        </Card>
      ) : (
        <div className="creator-editorial-grid">
          {legends.map((legend) => (
            <CreatorLegendCard
              key={legend.id}
              legend={legend}
              {...getCreatorLegendCardData(legend, { allowDelete: false })}
              onEdit={openEditor}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default CreatorReviewsPage;
