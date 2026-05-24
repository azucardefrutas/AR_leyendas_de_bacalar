import { Link, Outlet } from 'react-router-dom';
import { appNavItems } from '../data/navigation.js';

function MainLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <nav className="app-nav" aria-label="Navegacion principal">
          {appNavItems.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">Leyendas de Bacalar</footer>
    </div>
  );
}

export default MainLayout;
