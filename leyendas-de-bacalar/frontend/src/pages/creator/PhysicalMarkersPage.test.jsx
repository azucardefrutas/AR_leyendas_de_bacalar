import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';
import PhysicalMarkersPage from './PhysicalMarkersPage.jsx';
import { getMyLegends } from '../../services/creatorService.js';
import { uploadLegendAsset } from '../../services/assetService.js';
import { inspectModelFile } from '../../components/3d/modelFileInspection.js';
import { expandModelFiles } from '../../components/3d/modelArchive.js';
import { createLegendScene, listLegendScenes, listLegendPhysicalMarkers, createLegendPhysicalMarker, updateLegendPhysicalMarker } from '../../services/backendApiService.js';

vi.mock('../../services/creatorService.js', () => ({ getMyLegends: vi.fn() }));
vi.mock('../../services/assetService.js', () => ({ uploadLegendAsset: vi.fn() }));
vi.mock('../../components/3d/modelFileInspection.js', () => ({ inspectModelFile: vi.fn() }));
vi.mock('../../components/3d/modelArchive.js', () => ({ expandModelFiles: vi.fn() }));
vi.mock('../../services/backendApiService.js', () => ({
  createLegendScene: vi.fn(), listLegendScenes: vi.fn(), listLegendPhysicalMarkers: vi.fn(),
  createLegendPhysicalMarker: vi.fn(), updateLegendPhysicalMarker: vi.fn(), deleteLegendPhysicalMarker: vi.fn(),
}));
vi.mock('../../components/3d/MarkerModelPreview.jsx', () => ({ default: () => <div>Modelo</div> }));
vi.mock('../../components/3d/ModelAnimationSettings.jsx', () => ({ default: ({ value }) => <div>{value.clips.join(', ')}</div> }));

const animation = { clips: ['Armature|walk'], inspected: true, autoplay: true, defaultClip: 'Armature|walk', loop: 'repeat', speed: 1, trigger: 'marker-found' };
const savedScene = { id: 'scene', name: 'Pirata', model_asset_id: 'model', assets: { id: 'model', url: 'pirata.glb' }, animationConfig: animation };
const marker = { id: 'pair', label: 'Pirata', status: 'published', marker: { imageUrl: 'marker.png', name: 'Marcador' }, model: { sceneId: 'scene', assetId: 'model', url: 'pirata.glb', name: 'Pirata' }, animationConfig: animation };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('IntersectionObserver', undefined);
  URL.createObjectURL = vi.fn(() => 'blob:test-model');
  URL.revokeObjectURL = vi.fn();
  getMyLegends.mockResolvedValue({ data: [{ id: 'legend', title: 'Mi historia' }] });
  listLegendScenes.mockResolvedValue({ scenes: [savedScene] });
  listLegendPhysicalMarkers.mockResolvedValue({ markers: [], legendPublished: false });
  inspectModelFile.mockResolvedValue(animation);
  expandModelFiles.mockImplementation(async (files) => files);
  uploadLegendAsset.mockResolvedValue({ data: { asset: { id: 'uploaded', file_url: 'new.glb' } } });
  createLegendScene.mockResolvedValue({ scene: { id: 'new-scene' } });
  createLegendPhysicalMarker.mockResolvedValue({ marker });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function openPage() {
  const user = userEvent.setup();
  render(<PhysicalMarkersPage />);
  await user.selectOptions(await screen.findByLabelText('Leyenda'), 'legend');
  await waitFor(() => expect(listLegendScenes).toHaveBeenCalledWith('legend', { scope: 'physical' }));
  await waitFor(() => expect(screen.queryByText('Cargando marcadores...')).not.toBeInTheDocument());
  return user;
}

describe('physical model library and associations', () => {
  it('loads only the physical library and associates a saved model without uploading it again', async () => {
    const user = await openPage();
    await user.click(screen.getByRole('button', { name: 'Guardados' }));
    await user.selectOptions(screen.getByLabelText('Modelo de esta leyenda'), 'scene');
    await user.upload(screen.getByLabelText(/Imagen del marcador/), new File(['png'], 'marker.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: 'Guardar par' }));
    await waitFor(() => expect(createLegendPhysicalMarker).toHaveBeenCalledWith('legend', expect.objectContaining({ model_asset_id: 'model', animation_config: animation })));
    expect(uploadLegendAsset).toHaveBeenCalledTimes(1);
    expect(uploadLegendAsset).toHaveBeenCalledWith(expect.objectContaining({ assetType: 'marker_image' }));
    expect(screen.getByRole('heading', { name: 'Asociaciones disponibles' })).toBeInTheDocument();
  });

  it('imports a batch independently and retries failed associations without duplicate uploads', async () => {
    const user = await openPage();
    createLegendScene.mockResolvedValueOnce({ scene: { id: 'one' } }).mockRejectedValueOnce(new Error('No se pudo guardar la asociacion.')).mockResolvedValueOnce({ scene: { id: 'two' } });
    const files = ['walk.glb', 'wave.glb'].map((name) => new File(['glb'], name));
    await user.upload(screen.getByLabelText('Archivos GLB o ZIP'), files);
    await user.click(screen.getByRole('button', { name: 'Importar modelos' }));
    await screen.findByText('1 de 2 modelos guardados para esta leyenda.');
    expect(uploadLegendAsset).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('alert')).toHaveTextContent('wave.glb');
    await user.click(screen.getByRole('button', { name: 'Importar modelos' }));
    await screen.findByText('1 de 1 modelos guardados para esta leyenda.');
    expect(uploadLegendAsset).toHaveBeenCalledTimes(2);
    expect(createLegendScene).toHaveBeenCalledTimes(3);
    for (const [, payload] of createLegendScene.mock.calls) expect(payload.scope).toBe('physical');
    expect(createLegendPhysicalMarker).not.toHaveBeenCalled();
  });

  it('reports invalid files without uploading or creating a scene', async () => {
    const user = await openPage();
    inspectModelFile.mockRejectedValue(new Error('GLB incompleto.'));
    await user.upload(screen.getByLabelText('Archivos GLB o ZIP'), new File(['broken'], 'broken.glb'));
    await user.click(screen.getByRole('button', { name: 'Importar modelos' }));
    await screen.findByText(/broken.glb: GLB incompleto/);
    expect(uploadLegendAsset).not.toHaveBeenCalled();
    expect(createLegendScene).not.toHaveBeenCalled();
  });

  it('keeps animation-save failures visible inside the open dialog', async () => {
    listLegendPhysicalMarkers.mockResolvedValue({ markers: [marker], legendPublished: false });
    updateLegendPhysicalMarker.mockRejectedValue(new Error('No se pudo guardar.'));
    const user = await openPage();
    await user.click(screen.getByRole('button', { name: 'Revisar animaciones de Pirata' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar animaciones' }));
    await waitFor(() => expect(within(dialog).getByRole('alert')).toHaveTextContent('No se pudo guardar.'));
  });
});
