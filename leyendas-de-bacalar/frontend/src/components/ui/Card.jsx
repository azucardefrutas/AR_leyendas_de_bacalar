function Card({ as: Component = 'article', className = '', ...props }) {
  return <Component className={`card ${className}`} {...props} />;
}

export default Card;
