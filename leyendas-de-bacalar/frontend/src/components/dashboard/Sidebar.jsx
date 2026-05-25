import { NavLink } from 'react-router-dom';

function Sidebar({ title, items }) {
  return (
    <aside className="sidebar">
      <h2>{title}</h2>
      <nav>
        {items.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
