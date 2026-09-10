import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { RolesProvider } from './context/RolesContext.jsx';
import { reloadForNewDeployOnce } from './lib/chunkReload.js';
import './styles/index.css';
import './styles/readerExperience.css';
import './styles/glassClay.css';
import './styles/bookLoader.css';

// Vite emite 'vite:preloadError' cuando un chunk (import dinamico) no carga — casi siempre
// porque hubo un despliegue nuevo y los archivos con hash viejo ya no existen. En vez de dejar
// que reviente ("Failed to fetch dynamically imported module"), recargamos una vez para traer
// la version nueva. (El errorElement del router es el respaldo si esto no alcanza a atraparlo.)
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadForNewDeployOnce();
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RolesProvider>
        <App />
      </RolesProvider>
    </AuthProvider>
  </React.StrictMode>,
);
