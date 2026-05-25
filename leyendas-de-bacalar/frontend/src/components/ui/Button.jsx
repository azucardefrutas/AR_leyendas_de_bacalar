function Button({ className = '', variant = 'primary', ...props }) {
  return (
    <button className={`btn btn-${variant} ${className}`} type="button" {...props} />
  );
}

export default Button;
