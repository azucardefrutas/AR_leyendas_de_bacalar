import React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FloatingBook from '../../components/3d/FloatingBook.jsx';
import Button from '../../components/ui/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getPublishedLegends } from '../../services/legendService.js';

const localCovers = [
  '/assets/portada carin hall.png',
  '/assets/portada la bruja.png',
  '/assets/portada los duentes del monte.png',
  '/assets/portada_ la serpiente del mar.png',
  '/assets/portada los relatos de san joaquin.png',
  '/assets/Portada_los guardianes.png',
];

function HomePage() {
  const { isAuthenticated } = useAuth();
  const [legends, setLegends] = useState([]);
  const [loading, setLoading] = useState(true);
  const redeemPath = isAuthenticated ? '/reader/redeem' : '/login';

  useEffect(() => {
    async function loadLegends() {
      const { data } = await getPublishedLegends();
      setLegends(data ?? []);
      setLoading(false);
    }

    loadLegends();
  }, []);

  return (
    <section className="home-cinema">
      <div className="hero-cover-wall" aria-hidden="true">
        {localCovers.map((cover) => (
          <img key={cover} src={cover} alt="" />
        ))}
      </div>

      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">Bienvenido a</p>
          <h1>Leyendas de Bacalar</h1>
          <p>
            Explora las leyendas, mitos y relatos que forman parte de nuestra cultura.
            Una biblioteca cultural para descubrir Bacalar desde sus relatos, memorias y misterios.
          </p>
          <div className="actions-row">
            <Link to="/catalog"><Button className="btn-hero">Explorar biblioteca</Button></Link>
            <Link to={redeemPath}><Button variant="ghost">Canjear codigo</Button></Link>
          </div>
        </div>

        <div className="home-book-stage">
          <FloatingBook />
        </div>
      </section>

      <section className="home-about-section" id="acerca">
        <p className="eyebrow">Acerca de</p>
        <h2>Un espacio para preservar y leer la memoria cultural de Bacalar</h2>
        <p>
          Leyendas de Bacalar reune relatos locales en una experiencia web visual,
          preparada para que lectores, creadores y administradores construyan una
          biblioteca cultural paso a paso.
        </p>
      </section>

      <section className="home-library-preview">
        <div>
          <p className="eyebrow">Biblioteca</p>
          <h2>Historias publicadas</h2>
        </div>
        {loading ? (
          <p className="state-message">Cargando leyendas...</p>
        ) : legends.length > 0 ? (
          <div className="mini-cover-row">
            {legends.slice(0, 6).map((legend, index) => (
              <Link key={legend.id} to={`/legend/${legend.slug}`} className="mini-cover">
                <img src={legend.cover_url || localCovers[index % localCovers.length]} alt="" />
                <span>{legend.title}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="premium-empty">
            <h3>Proximamente nuevas leyendas</h3>
            <p>Los creadores aun estan preparando historias. Canjea un codigo o explora el catalogo para comenzar.</p>
          </div>
        )}
      </section>
    </section>
  );
}

export default HomePage;
