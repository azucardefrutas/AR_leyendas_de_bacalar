import React from 'react';
import { useParams } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';

function ReadingPage() {
  const { slug } = useParams();

  return (
    <Card className="page-stack">
      <h1>Lectura</h1>
      <p>Visor base para la leyenda: {slug}</p>
    </Card>
  );
}

export default ReadingPage;
