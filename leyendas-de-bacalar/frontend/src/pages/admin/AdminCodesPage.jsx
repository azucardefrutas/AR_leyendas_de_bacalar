import React from 'react';
import { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { adminGetAccessCodes, adminGetCodeBatches } from '../../services/codeService.js';

function AdminCodesPage() {
  const [batches, setBatches] = useState([]);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadCodes() {
      const [{ data: batchData, error: batchError }, { data: codeData, error: codeError }] = await Promise.all([
        adminGetCodeBatches(),
        adminGetAccessCodes(),
      ]);
      setBatches(batchData ?? []);
      setCodes(codeData ?? []);
      setError(batchError ?? codeError);
      setLoading(false);
    }

    loadCodes();
  }, []);

  if (loading) return <LoadingState />;

  return (
    <section className="page-stack">
      <h1>Codigos unicos</h1>
      {error && <p className="error-message">{error.message}</p>}
      <Card><h2>Lotes</h2><p>{batches.length} lotes encontrados.</p></Card>
      <Card><h2>Codigos</h2><p>{codes.length} codigos encontrados.</p></Card>
    </section>
  );
}

export default AdminCodesPage;
