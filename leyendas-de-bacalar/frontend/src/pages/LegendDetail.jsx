import { useParams } from 'react-router-dom';

function LegendDetail() {
  const { legendId } = useParams();

  return (
    <section className="page-stack">
      <h1>Detalle de leyenda</h1>
      <p>Pagina base para mostrar la leyenda: {legendId}</p>
    </section>
  );
}

export default LegendDetail;
