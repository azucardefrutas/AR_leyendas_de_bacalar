import React from 'react';

function GenreChips({ genres = [] }) {
  if (!genres.length) return null;

  return (
    <div className="creator-card-genres" aria-label="Generos">
      {genres.map((genre) => <span key={genre}>{genre}</span>)}
    </div>
  );
}

export default GenreChips;
