import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { RolesProvider } from './context/RolesContext.jsx';
import './styles/index.css';
import './styles/readerExperience.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RolesProvider>
        <App />
      </RolesProvider>
    </AuthProvider>
  </React.StrictMode>,
);
