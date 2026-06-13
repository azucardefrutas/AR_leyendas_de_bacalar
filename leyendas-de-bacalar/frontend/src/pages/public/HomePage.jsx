import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import FloatingBook from '../../components/3d/FloatingBook.jsx';
import ModelShowcaseSection from '../../components/3d/ModelShowcaseSection.jsx';
import Button from '../../components/ui/Button.jsx';
import LandingIntroOverlay from '../../components/landing/LandingIntroOverlay.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getLoginPathForRedirect } from '../../utils/authRedirect.js';

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
  const redeemPath = isAuthenticated ? '/reader/redeem' : getLoginPathForRedirect('/reader/redeem');
  // Local-only: the cinematic intro plays on each home mount during development.
  const [introDone, setIntroDone] = useState(false);

  return (
    <section className="home-cinema">
      {!introDone && <LandingIntroOverlay onFinish={() => setIntroDone(true)} />}
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

      <ModelShowcaseSection
        title="Modelos 3D de las leyendas"
        subtitle="Recorre las criaturas y objetos de Bacalar. Desplázate para explorarlos y ábrelos para girarlos con el mouse o el dedo."
      />

      <div className="home-content-spacer" id="acerca" aria-hidden="true" />
    </section>
  );
}

export default HomePage;
