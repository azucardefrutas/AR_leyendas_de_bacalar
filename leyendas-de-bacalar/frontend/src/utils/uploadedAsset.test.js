import { describe, it, expect } from 'vitest';
import { pickUploadedAsset } from './uploadedAsset.js';

describe('pickUploadedAsset (normaliza las dos formas de uploadProjectAsset)', () => {
  it('extrae el asset de la forma del backend: { data: { asset, relation } }', () => {
    const result = { data: { asset: { id: 'asset-1', file_url: 'x' }, relation: { type: 'legend_media' } }, error: null };
    expect(pickUploadedAsset(result)).toEqual({ id: 'asset-1', file_url: 'x' });
  });

  // Esta es la forma que rompia la pagina de marcadores: sin forceBackend, la subida
  // cae a Supabase directo y devuelve el asset EN data, no en data.asset.
  it('extrae el asset de la forma directa de Supabase: { data: <asset> }', () => {
    const result = { data: { id: 'asset-2', file_url: 'y' }, error: null };
    expect(pickUploadedAsset(result)).toEqual({ id: 'asset-2', file_url: 'y' });
  });

  it('devuelve null si no hay data', () => {
    expect(pickUploadedAsset({ data: null, error: { message: 'boom' } })).toBeNull();
    expect(pickUploadedAsset(null)).toBeNull();
    expect(pickUploadedAsset(undefined)).toBeNull();
  });

  it('devuelve null si el asset no trae id (en vez de reventar mas adelante)', () => {
    expect(pickUploadedAsset({ data: {} })).toBeNull();
    expect(pickUploadedAsset({ data: { asset: {} } })).toBeNull();
  });
});
