import React from 'react';
function Input({ icon, label, id, className = '', ...props }) {
  return (
    <label className="field" htmlFor={id}>
      {label && <span>{label}</span>}
      <span className="input-shell">
        {icon && <span className="input-icon" aria-hidden="true">{icon}</span>}
        <input id={id} className={`input ${className}`} {...props} />
      </span>
    </label>
  );
}

export default Input;
