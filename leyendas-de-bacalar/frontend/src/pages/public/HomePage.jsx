import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import FloatingBook from '../../components/3d/FloatingBook.jsx';
import ModelShowcaseSection from '../../components/3d/ModelShowcaseSection.jsx';
import Button from '../../components/ui/Button.jsx';
import LandingIntroOverlay from '../../components/landing/LandingIntroOverlay.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getLoginPathForRedirect } from '../../utils/authRedirect.js';

function HomePage() {
  const { isAuthenticated } = useAuth();
  const redeemPath = isAuthenticated ? '/reader/redeem' : getLoginPathForRedirect('/reader/redeem');
  // Local-only: the cinematic intro plays on each home mount during development.
  const [introDone, setIntroDone] = useState(false);

  return (
    <div className="home-page">
      {!introDone && <LandingIntroOverlay onFinish={() => setIntroDone(true)} />}

      {/* ---- Hero: cinematic, full-bleed. Background belongs ONLY here. ---- */}
      <section className="home-hero">
        <div className="hero-background" aria-hidden="true" />
        <div className="hero-content">
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
        </div>
      </section>

      {/* ---- Models 3D: separate section, own identity, sticky carousel. ---- */}
      <ModelShowcaseSection
        title="Modelos 3D de las leyendas"
        subtitle="Recorre las criaturas y objetos de Bacalar. Desplázate para explorarlos y ábrelos para girarlos con el mouse o el dedo."
      />

      <div className="home-content-spacer" id="acerca" aria-hidden="true" />
    </div>
  );
}

export default HomePage;
