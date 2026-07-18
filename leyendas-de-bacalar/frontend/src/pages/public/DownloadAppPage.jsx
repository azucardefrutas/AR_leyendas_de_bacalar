import React from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../../components/ui/AppIcon.jsx';

// La URL del APK se configura fuera del codigo (env). Asi puedes hospedarlo donde
// quieras (Supabase Storage, GitHub Releases, /public) y actualizarlo sin tocar la app.
const APK_URL = import.meta.env.VITE_APK_URL || '';
const APK_VERSION = import.meta.env.VITE_APK_VERSION || '';

const STEPS = [
  { icon: 'download', title: 'Descarga el APK', text: 'Toca el boton desde tu telefono Android.' },
  { icon: 'shield', title: 'Permite la instalacion', text: 'Si Android lo pide, activa "instalar de esta fuente".' },
  { icon: 'qr_code_scanner', title: 'Escanea y explora', text: 'Abre la app y apunta la camara al marcador del libro.' },
];

const FEATURES = [
  { icon: 'view_in_ar', title: 'Realidad aumentada', text: 'Los marcadores impresos cobran vida en 3D sobre tu mesa.' },
  { icon: 'auto_stories', title: 'Ligada a tus leyendas', text: 'Cada marcador abre el modelo de la leyenda a la que pertenece.' },
  { icon: 'wifi_off', title: 'Pensada para el aula', text: 'Escaneo rapido, pensada para telefonos de gama media.' },
];

export default function DownloadAppPage() {
  const hasApk = Boolean(APK_URL);

  return (
    <section className="appdl">
      <div className="appdl-aurora" aria-hidden="true" />

      <div className="appdl-inner">
        <header className="appdl-hero">
          <span className="appdl-badge">
            <AppIcon name="android" size={17} /> App móvil · Android
          </span>

          <div className="appdl-hero-grid">
            <div className="appdl-hero-copy">
              <h1>Leyendas de Bacalar<span>en tu bolsillo</span></h1>
              <p>
                El escáner de <strong>realidad aumentada</strong> del proyecto. Apunta la cámara al
                marcador impreso de tu libro y el modelo 3D de la leyenda aparece frente a ti.
              </p>

              <div className="appdl-cta">
                {hasApk ? (
                  <a className="appdl-download" href={APK_URL} download>
                    <AppIcon name="download" size={24} />
                    <span>
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

              <p className="appdl-note">
                <AppIcon name="info" size={15} /> Solo Android por ahora. En iPhone puedes usar la
                experiencia AR desde el navegador, dentro de cada leyenda.
              </p>
            </div>

            <div className="appdl-device" aria-hidden="true">
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
          </div>
        </header>

        <div className="appdl-cols">
          <section className="appdl-panel" aria-label="Cómo instalar">
            <h2>Cómo instalarla</h2>
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

          <section className="appdl-panel" aria-label="Qué incluye">
            <h2>Qué incluye</h2>
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
