import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InsertModel3DModal from './InsertModel3DModal.jsx';
import { inspectModelFile } from '../../3d/modelFileInspection.js';

vi.mock('../../3d/modelFileInspection.js', () => ({ inspectModelFile: vi.fn() }));
vi.mock('../../3d/ModelAnimationSettings.jsx', () => ({ default: ({ value }) => <span>{value.clips.join(', ')}</span> }));

const detected = { clips: ['Armature|walking_man|baselayer'], defaultClip: 'Armature|walking_man|baselayer', inspected: true, autoplay: true, loop: 'repeat', speed: 1, trigger: 'load' };
beforeEach(() => { vi.resetAllMocks(); inspectModelFile.mockResolvedValue(detected); });
afterEach(cleanup);

it('inserts the actual file clips and keeps them when reselecting the newly uploaded model', async () => {
  const user = userEvent.setup();
  const onInsert = vi.fn();
  const onUploadAsset = vi.fn().mockResolvedValue({ id: 'new-model', name: 'Pirata', previewUrl: 'pirata.glb', animationConfig: {} });
  render(<InsertModel3DModal assets={[{ id: 'other', name: 'Otro modelo', previewUrl: 'other.glb' }]} onInsert={onInsert} onClose={vi.fn()} onUploadAsset={onUploadAsset} />);
  await user.upload(screen.getByLabelText(/Subir modelo nuevo/), new File(['glb'], 'pirata.glb'));
  await screen.findByText(detected.defaultClip);
  await user.selectOptions(screen.getByLabelText('Modelo disponible'), 'other');
  await user.selectOptions(screen.getByLabelText('Modelo disponible'), 'new-model');
  await user.click(screen.getByRole('button', { name: 'Insertar modelo', exact: true }));
  expect(onInsert).toHaveBeenCalledWith(expect.objectContaining({ assetId: 'new-model', animationConfig: detected }));
});

it('does not upload an incomplete GLB or insert anything after validation fails', async () => {
  inspectModelFile.mockRejectedValue(new Error('GLB incompleto.'));
  const user = userEvent.setup();
  const onInsert = vi.fn();
  const onUploadAsset = vi.fn();
  render(<InsertModel3DModal onInsert={onInsert} onClose={vi.fn()} onUploadAsset={onUploadAsset} />);
  await user.upload(screen.getByLabelText(/Subir modelo nuevo/), new File(['broken'], 'pirata.glb'));
  await screen.findByText('GLB incompleto.');
  expect(onUploadAsset).not.toHaveBeenCalled();
  expect(onInsert).not.toHaveBeenCalled();
});
