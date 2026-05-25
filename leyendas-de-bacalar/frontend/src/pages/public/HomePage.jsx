import { Link } from 'react-router-dom';
import LegendBanner from '../../components/catalog/LegendBanner.jsx';
import Button from '../../components/ui/Button.jsx';

function HomePage() {
  return (
    <section className="page-stack">
      <LegendBanner
        title="Leyendas de Bacalar"
        description="Una plataforma cultural para leer, desbloquear y preservar relatos vinculados a Bacalar."
      />
      <div className="actions-row">
        <Link to="/catalog"><Button>Explorar catalogo</Button></Link>
        <Link to="/reader/redeem"><Button variant="secondary">Canjear codigo</Button></Link>
      </div>
    </section>
  );
}

export default HomePage;
