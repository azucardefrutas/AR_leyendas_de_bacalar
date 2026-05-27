import React from 'react';
import { AdminSectionHeader } from '../../components/ui/AdminPrimitives.jsx';

function AdminSettingsPage() {
  return (
    <section className="admin-page">
      <AdminSectionHeader eyebrow="Sistema" title="Configuracion" description="Opciones preparadas para una futura tabla system_settings." />
      <div className="admin-settings-grid">
        {[
          ['Modo mantenimiento', 'Pendiente de conectar a tabla system_settings.'],
          ['Lectura gratuita global', 'Control futuro para acceso temporal a contenido.'],
          ['Limite de subida', 'Preparado para reglas de Storage.'],
          ['Mensaje del sistema', 'Aviso visible para lectores y autores.'],
        ].map(([title, text]) => (
          <article className="admin-setting-card" key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
            <label>
              <input type="checkbox" disabled />
              Pendiente
            </label>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AdminSettingsPage;
