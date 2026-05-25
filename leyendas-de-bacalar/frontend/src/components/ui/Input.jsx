import React from 'react';
function Input({ label, id, className = '', ...props }) {
  return (
    <label className="field" htmlFor={id}>
      {label && <span>{label}</span>}
      <input id={id} className={`input ${className}`} {...props} />
    </label>
  );
}

export default Input;
