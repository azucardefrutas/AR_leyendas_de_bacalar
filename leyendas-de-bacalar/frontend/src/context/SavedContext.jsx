import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { getMyFavoriteIds, getMyShelf, setFavorite, setShelf } from '../services/readerService.js';

const SavedContext = createContext(null);

const EMPTY = {
  shelf: [],
  isOnShelf: () => false,
  isFavorite: () => false,
  toggleShelf: () => {},
  toggleFavorite: () => {},
  reloadSaved: () => {},
};

// Holds the reader's shelf (saved stories) + favorite ids once, so the + / ♥
// icons across the catalog, carousels and detail stay in sync with optimistic
// toggles.
export function SavedProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [shelf, setShelfList] = useState([]);
  const [shelfIds, setShelfIds] = useState(() => new Set());
  const [favIds, setFavIds] = useState(() => new Set());

  const reloadSaved = useCallback(async () => {
    if (!isAuthenticated) {
      setShelfList([]);
      setShelfIds(new Set());
      setFavIds(new Set());
      return;
    }
    const [shelfRes, favRes] = await Promise.all([getMyShelf(), getMyFavoriteIds()]);
    const items = shelfRes.data ?? [];
    setShelfList(items);
    setShelfIds(new Set(items.map((i) => i.legend_id)));
    setFavIds(new Set(favRes.data ?? []));
  }, [isAuthenticated]);

  useEffect(() => { reloadSaved(); }, [reloadSaved]);

  const toggleShelf = useCallback(async (legend) => {
    if (!legend?.id) return;
    const id = legend.id;
    const on = !shelfIds.has(id);
    setShelfIds((prev) => { const next = new Set(prev); if (on) next.add(id); else next.delete(id); return next; });
    setShelfList((prev) => (on
      ? [{ legend_id: id, legend: { id, title: legend.title, slug: legend.slug, coverUrl: legend.coverUrl || legend.cover_url || null } }, ...prev]
      : prev.filter((i) => i.legend_id !== id)));
    const { error } = await setShelf(id, on);
    if (error) reloadSaved();
  }, [shelfIds, reloadSaved]);

  const toggleFavorite = useCallback(async (legendId) => {
    if (!legendId) return;
    const on = !favIds.has(legendId);
    setFavIds((prev) => { const next = new Set(prev); if (on) next.add(legendId); else next.delete(legendId); return next; });
    const { error } = await setFavorite(legendId, on);
    if (error) reloadSaved();
  }, [favIds, reloadSaved]);

  const value = useMemo(() => ({
    shelf,
    isOnShelf: (id) => shelfIds.has(id),
    isFavorite: (id) => favIds.has(id),
    toggleShelf,
    toggleFavorite,
    reloadSaved,
  }), [shelf, shelfIds, favIds, toggleShelf, toggleFavorite, reloadSaved]);

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved() {
  return useContext(SavedContext) || EMPTY;
}
