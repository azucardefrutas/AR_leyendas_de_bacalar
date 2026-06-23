import React from 'react';
function LegendBanner({ title, description }) {
  return (
    <section className="legend-banner">
      <div>
        <p className="eyebrow">Streaming cultural</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}

export default LegendBanner;
