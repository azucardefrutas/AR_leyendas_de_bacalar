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
  const [introDone, setIntroDone] = useState(false);

  return (
    <main className="home-page">
      {!introDone && <LandingIntroOverlay onFinish={() => setIntroDone(true)} />}

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

      <ModelShowcaseSection ariaLabel="Galeria de modelos 3D de Leyendas de Bacalar" />

      <div className="home-content-spacer" id="acerca" aria-hidden="true" />
    </main>
  );
}

export default HomePage;
