import React from 'react';
import { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { getActiveProducts } from '../../services/purchaseService.js';

function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProducts() {
      const { data, error: productsError } = await getActiveProducts();
      setProducts(data ?? []);
      setError(productsError);
      setLoading(false);
    }

    loadProducts();
  }, []);

  if (loading) return <LoadingState />;

  return (
    <section className="page-stack">
      <h1>Productos</h1>
      {error && <p className="error-message">{error.message}</p>}
      {products.map((product) => <Card key={product.id}><h2>{product.name}</h2><p>{product.price}</p></Card>)}
    </section>
  );
}

export default AdminProductsPage;
