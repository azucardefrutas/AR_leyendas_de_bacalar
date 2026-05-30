import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';

function LegalDocumentPage({ title, intro, sections }) {
  return (
    <section className="legal-page">
      <div className="legal-hero">
        <p className="eyebrow">Leyendas de Bacalar</p>
        <h1>{title}</h1>
        <p>Ultima actualizacion: mayo de 2026</p>
        <p className="legal-note">Documento base para proyecto academico, sujeto a revision legal.</p>
      </div>

      <article className="legal-document">
        {intro && <p className="legal-intro">{intro}</p>}
        {sections.map((section) => (
          <section className="legal-section" key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
      </article>

      <div className="actions-row">
        <Link to="/">
          <Button variant="ghost">Volver al inicio</Button>
        </Link>
        <Link to="/register">
          <Button>Crear cuenta</Button>
        </Link>
      </div>
    </section>
  );
}

export default LegalDocumentPage;
