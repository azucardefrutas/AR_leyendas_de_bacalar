import { Outlet } from 'react-router-dom';

function AuthLayout() {
  return (
    <main className="app-main">
      <Outlet />
    </main>
  );
}

export default AuthLayout;
