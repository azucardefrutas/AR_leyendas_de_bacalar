import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import LoadingState from '../components/ui/LoadingState.jsx';

function AuthLayout() {
  return (
    <main className="auth-page">
      <div className="auth-cinematic-bg" aria-hidden="true" />
      <Suspense fallback={<LoadingState message="Cargando..." />}>
        <Outlet />
      </Suspense>
    </main>
  );
}

export default AuthLayout;
