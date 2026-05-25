import { useParams } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';

function EditLegendPage() {
  const { legendId } = useParams();

  return (
    <Card className="page-stack">
      <h1>Editar leyenda</h1>
      <p>Editor base para leyenda: {legendId}</p>
    </Card>
  );
}

export default EditLegendPage;
