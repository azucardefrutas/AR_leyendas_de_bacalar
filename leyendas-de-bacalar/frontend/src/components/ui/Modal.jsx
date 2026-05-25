function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button type="button" onClick={onClose}>Cerrar</button>
        </header>
        {children}
      </section>
    </div>
  );
}

export default Modal;
