import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ArCameraExperience from '../../components/ar/ArCameraExperience.jsx';
import ArPermissionHelp from '../../components/ar/ArPermissionHelp.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import {
  getArExperienceByLegendSlug,
  getArExperienceBySceneId,
} from '../../services/arExperienceService.js';

function ArExperiencePage() {
  const { sceneId, legendSlug } = useParams();
  const [experience, setExperience] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadExperience() {
      setLoading(true);
      setError(null);
      try {
        const data = sceneId
          ? await getArExperienceBySceneId(sceneId)
          : await getArExperienceByLegendSlug(legendSlug);
        if (!cancelled) setExperience(data);
      } catch (loadError) {
        if (!cancelled) setError(loadError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadExperience();
    return () => { cancelled = true; };
  }, [legendSlug, sceneId]);

  if (loading) return <LoadingState message="Preparando camara AR..." />;

  if (error) {
    return (
      <main className="ar-experience-page">
        <EmptyState title="Camara AR no disponible" message={error.message} />
        <Link className="btn btn-ghost" to="/catalog">Volver al catalogo</Link>
      </main>
    );
  }

  return (
    <main className="ar-experience-page">
      <div className="ar-experience-header">
        <div>
          <p className="creator-kicker">Extra opcional</p>
          <h1>Ver con camara AR</h1>
          <p>Esta vista queda aislada del lector digital CONALITEG.</p>
        </div>
        <Link className="btn btn-ghost" to="/catalog">Salir</Link>
      </div>

      <div className="ar-experience-grid">
        <ArCameraExperience experience={experience} />
        <ArPermissionHelp />
      </div>
    </main>
  );
}

export default ArExperiencePage;
