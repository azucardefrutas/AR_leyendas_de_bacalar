import React from 'react';
import { useParams } from 'react-router-dom';
import LegendEditor from '../../components/creator/LegendEditor.jsx';

function EditLegendPage() {
  const { id, legendId } = useParams();
  return <LegendEditor legendId={id || legendId} />;
}

export default EditLegendPage;
