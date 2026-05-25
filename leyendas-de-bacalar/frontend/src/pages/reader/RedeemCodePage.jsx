import { useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import { redeemCode } from '../../services/codeService.js';

function RedeemCodePage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const { data, error: redeemError } = await redeemCode(code.trim());
    setLoading(false);

    if (redeemError) {
      setError(redeemError.message);
      return;
    }

    setResult(data);
    setCode('');
  }

  return (
    <Card className="page-stack">
      <h1>Canjear codigo</h1>
      <p>Ingresa el codigo unico incluido en una edicion fisica.</p>
      <form className="form-stack" onSubmit={handleSubmit}>
        <Input id="code" label="Codigo" value={code} onChange={(event) => setCode(event.target.value)} required />
        {error && <p className="error-message">{error}</p>}
        {result && <p className="success-message">Codigo canjeado correctamente.</p>}
        <Button type="submit" disabled={loading}>{loading ? 'Canjeando...' : 'Canjear'}</Button>
      </form>
    </Card>
  );
}

export default RedeemCodePage;
