import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../ui/Button.jsx';
import Card from '../../ui/Card.jsx';

function CreatorApplyCtaCard() {
  return (
    <Card className="creator-application-card">
      <div>
        <p className="eyebrow">Creador</p>
        <h2>Tienes una leyenda de Bacalar que compartir?</h2>
        <p>
          Revisa los terminos para creadores y continua con la solicitud para publicar
          historias, recursos y experiencias culturales.
        </p>
      </div>
      <Link to="/creator/apply">
        <Button>Solicitar ser creador</Button>
      </Link>
    </Card>
  );
}

export default CreatorApplyCtaCard;
