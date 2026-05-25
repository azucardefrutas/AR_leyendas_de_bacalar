import { Outlet } from 'react-router-dom';

function AuthLayout() {
  return (
    <main className="auth-page">
      <Outlet />
    </main>
  );
}

export default AuthLayout;
