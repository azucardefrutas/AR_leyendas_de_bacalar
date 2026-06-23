export function uniqueMediaCandidates(candidates = []) {
  return [...new Set(candidates.filter(Boolean))];
}

export function getNextMediaCandidate(candidates = [], current = null) {
  const unique = uniqueMediaCandidates(candidates);
  if (unique.length < 2) return null;
  const currentIndex = unique.indexOf(current);
  if (currentIndex < 0) return unique[0] || null;
  return unique[(currentIndex + 1) % unique.length] || null;
}
