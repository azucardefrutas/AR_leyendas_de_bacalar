import { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { getPendingContentReviews } from '../../services/adminService.js';

function AdminLegendsReviewPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadReviews() {
      const { data, error: reviewsError } = await getPendingContentReviews();
      setReviews(data ?? []);
      setError(reviewsError);
      setLoading(false);
    }

    loadReviews();
  }, []);

  if (loading) return <LoadingState />;

  return (
    <section className="page-stack">
      <h1>Revision de leyendas</h1>
      {error && <p className="error-message">{error.message}</p>}
      {reviews.map((review) => <Card key={review.id}><h2>{review.status}</h2><p>{review.feedback}</p></Card>)}
    </section>
  );
}

export default AdminLegendsReviewPage;
