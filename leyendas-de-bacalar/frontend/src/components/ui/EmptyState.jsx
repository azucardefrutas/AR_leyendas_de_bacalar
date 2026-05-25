function EmptyState({ title = 'Sin resultados', message = 'Todavia no hay contenido para mostrar.' }) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}

export default EmptyState;
