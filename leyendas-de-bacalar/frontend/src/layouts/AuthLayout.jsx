import React from 'react';
import { Outlet } from 'react-router-dom';

function AuthLayout() {
  return (
    <main className="auth-page">
      <div className="auth-cinematic-bg" aria-hidden="true" />
      <Outlet />
    </main>
  );
}

export default AuthLayout;
