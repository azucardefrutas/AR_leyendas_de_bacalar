import React from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../../components/ui/AppIcon.jsx';
import ParticleField from '../../components/ui/ParticleField.jsx';

// La URL del APK se configura fuera del codigo (env). Asi puedes hospedarlo donde
// quieras (GitHub Releases, Supabase Storage, /public) y actualizarlo sin tocar la app.
const APK_URL = import.meta.env.VITE_APK_URL || '';
const APK_VERSION = import.meta.env.VITE_APK_VERSION || '';

const STEPS = [
  { icon: 'download', title: 'Descarga el APK', text: 'Toca el botón desde tu teléfono Android.' },
  { icon: 'shield', title: 'Permite la instalación', text: 'Si Android lo pide, activa "instalar de esta fuente".' },
  { icon: 'qr_code_scanner', title: 'Escanea y explora', text: 'Abre la app y apunta la cámara al marcador del libro.' },
];

const FEATURES = [
  { icon: 'view_in_ar', title: 'Realidad aumentada', text: 'Los marcadores impresos cobran vida en 3D sobre tu mesa.' },
  { icon: 'auto_stories', title: 'Ligada a tus leyendas', text: 'Cada marcador abre el modelo de la leyenda a la que pertenece.' },
  { icon: 'wifi_off', title: 'Pensada para el aula', text: 'Escaneo rápido, pensada para teléfonos de gama media.' },
];

export default function DownloadAppPage() {
  const hasApk = Boolean(APK_URL);

  return (
    <section className="appdl">
      {/* Profundidad tipo cenote + motas de luz que ascienden + viñeta */}
      <div className="appdl-depth" aria-hidden="true" />
      <ParticleField className="appdl-particles" />
      <div className="appdl-vignette" aria-hidden="true" />

      <div className="appdl-inner">
        <header className="appdl-hero">
          <div className="appdl-hero-copy">
            <span className="appdl-badge appdl-rise" style={{ '--d': '0ms' }}>
              <AppIcon name="android" size={17} /> App móvil · Android
            </span>

            <h1 className="appdl-title appdl-rise" style={{ '--d': '90ms' }}>
              Leyendas de Bacalar
              <em>en tu bolsillo</em>
            </h1>

            <p className="appdl-lead appdl-rise" style={{ '--d': '170ms' }}>
              El escáner de <strong>realidad aumentada</strong> del proyecto. Apunta la cámara al
              marcador impreso de tu libro y el modelo 3D de la leyenda emerge frente a ti.
            </p>

            <div className="appdl-cta appdl-rise" style={{ '--d': '250ms' }}>
              {hasApk ? (
                <a className="appdl-download" href={APK_URL} download rel="noopener">
                  <span className="appdl-download-ico"><AppIcon name="download" size={24} /></span>
                  <span className="appdl-download-txt">
                    <strong>Descargar APK</strong>
                    <em>{APK_VERSION ? `Versión ${APK_VERSION} · Android` : 'Para Android'}</em>
                  </span>
                </a>
              ) : (
                <div className="appdl-soon">
                  <AppIcon name="hourglass_top" size={22} />
                  <span>La descarga estará disponible muy pronto.</span>
                </div>
              )}
              <Link className="appdl-secondary" to="/catalog">
                <AppIcon name="menu_book" size={20} /> Ver el catálogo
              </Link>
            </div>

            <p className="appdl-note appdl-rise" style={{ '--d': '330ms' }}>
              <AppIcon name="info" size={15} /> Solo Android por ahora. En iPhone puedes usar la
              experiencia AR desde el navegador, dentro de cada leyenda.
            </p>
          </div>

          <div className="appdl-device appdl-rise" style={{ '--d': '210ms' }}>
            <span className="appdl-phone-halo" aria-hidden="true" />
            <div className="appdl-phone">
              <span className="appdl-phone-notch" />
              <div className="appdl-phone-screen">
                <img className="appdl-phone-appicon" src="/app-icon.png" alt="Icono de Leyendas de Bacalar" />
                <span className="appdl-phone-name">Leyendas de Bacalar</span>
                <span className="appdl-phone-sub">Realidad aumentada</span>
                <span className="appdl-phone-scan" />
              </div>
            </div>
          </div>
        </header>

        <div className="appdl-cols">
          <section className="appdl-panel appdl-rise" style={{ '--d': '380ms' }} aria-label="Cómo instalar">
            <h2><span className="appdl-panel-kicker">01</span> Cómo instalarla</h2>
            <ol className="appdl-steps">
              {STEPS.map((step, i) => (
                <li key={step.icon}>
                  <span className="appdl-step-num">{i + 1}</span>
                  <span className="appdl-step-icon"><AppIcon name={step.icon} size={22} /></span>
                  <span className="appdl-step-copy">
                    <strong>{step.title}</strong>
                    <em>{step.text}</em>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="appdl-panel appdl-rise" style={{ '--d': '460ms' }} aria-label="Qué incluye">
            <h2><span className="appdl-panel-kicker">02</span> Qué incluye</h2>
            <ul className="appdl-features">
              {FEATURES.map((f) => (
                <li key={f.icon}>
                  <span className="appdl-feature-icon"><AppIcon name={f.icon} size={22} /></span>
                  <span className="appdl-feature-copy">
                    <strong>{f.title}</strong>
                    <em>{f.text}</em>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="appdl-foot">
          <span><AppIcon name="verified_user" size={16} /> Distribuida por la Universidad Politécnica de Bacalar.</span>
          <span><AppIcon name="smartphone" size={16} /> Requiere Android 8.0 o superior con cámara.</span>
        </footer>
      </div>
    </section>
  );
}
