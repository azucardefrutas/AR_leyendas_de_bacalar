# Sección "Cargar modelo y marcador (app móvil / libro físico)" — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al autor una sección en el panel de creador para registrar pares marcador(imagen)↔modelo(GLB) por leyenda, independientes de página, que la app móvil ya existente escanea sin recompilar el APK.

**Architecture:** Se agrega un tercer `target_type='physical_edition'` a `interactive_hotspots` (marcador sin página). El backend orquesta con service-role reutilizando `createScene`/`linkPhysicalEditionMarker`, publica el hotspot al instante, y la app móvil lee la misma tabla que ya lee. Frontend: página nueva con selector de leyenda + tabla por leyenda + formulario de subida.

**Tech Stack:** PostgreSQL (Supabase) · Node/Express (ESM, service-role) · React 18 + Vite + React Router · assetService (signed upload backend).

**Verificación (patrón real del repo, no hay harness de tests unitarios para código service-role):** `node --check` (backend `npm run build`), `eslint --max-warnings 0` (frontend `npm run lint`), verificación de constraints y feed en la DB en vivo (Supabase MCP), y prueba E2E manual. Consistente con CLAUDE.md §12/§15.

**Nota de git:** El árbol tiene cambios sin commitear en `leyendas-de-bacalar/mobile/` ajenos a esta tarea. NO incluirlos en ningún commit. Commitear solo los archivos que toca este plan.

---

### Task 1: Migración DB — `target_type='physical_edition'`

**Files:**
- Create: `leyendas-de-bacalar/backend/supabase/migrations/20260716_hotspots_physical_edition.sql`
- Apply: Supabase proyecto `wkkzgyhyarqwxoqcdaul` (vía MCP `apply_migration`)

- [ ] **Step 1: Escribir el archivo de migración**

```sql
-- 20260716_hotspots_physical_edition.sql
-- Permite un tercer objetivo de hotspot: 'physical_edition' (marcador de libro fisico,
-- sin pagina). La app movil ya lee interactive_hotspots sin filtrar por target_type, asi
-- que estos marcadores aparecen en el escaner sin cambios de codigo. Migracion aditiva:
-- las filas existentes (source_document / legend_page) siguen cumpliendo ambos CHECK.
begin;

alter table public.interactive_hotspots
  drop constraint interactive_hotspots_target_type_check;
alter table public.interactive_hotspots
  add constraint interactive_hotspots_target_type_check
  check (target_type = any (array['source_document','legend_page','physical_edition']));

alter table public.interactive_hotspots
  drop constraint hotspot_target_coherent;
alter table public.interactive_hotspots
  add constraint hotspot_target_coherent check (
    (target_type = 'source_document'
       and source_document_id is not null
       and source_page_number is not null
       and page_id is null)
    or (target_type = 'legend_page'
       and page_id is not null
       and source_document_id is null)
    or (target_type = 'physical_edition'
       and page_id is null
       and source_document_id is null
       and source_page_number is null)
  );

commit;
```

- [ ] **Step 2: Aplicar la migración en Supabase (MCP `apply_migration`)**

name: `hotspots_physical_edition`, project_id: `wkkzgyhyarqwxoqcdaul`, query: el SQL de arriba (sin `begin/commit`; `apply_migration` maneja la transacción).

- [ ] **Step 3: Verificar los CHECK actualizados (MCP `execute_sql`)**

```sql
select conname, pg_get_constraintdef(oid) as def
from pg_constraint
where conrelid = 'public.interactive_hotspots'::regclass
  and conname in ('interactive_hotspots_target_type_check','hotspot_target_coherent');
```
Esperado: `target_type_check` incluye `physical_edition`; `hotspot_target_coherent` tiene la tercera rama.

- [ ] **Step 4: Probar que acepta la fila nueva y rechaza inválidas (savepoint + rollback)**

```sql
-- Debe INSERTAR ok una fila physical_edition (todo null menos marker) y luego revertir.
do $$
declare v_legend uuid;
begin
  select id into v_legend from public.legends limit 1;
  insert into public.interactive_hotspots (legend_id, target_type, hotspot_type, x, y, status)
  values (v_legend, 'physical_edition', 'model', 0.5, 0.5, 'draft');
  raise notice 'physical_edition INSERT ok';
  raise exception 'rollback-test';   -- forzamos rollback para no persistir
exception when others then
  if sqlerrm <> 'rollback-test' then raise; end if;
  raise notice 'revertido';
end $$;
```
Esperado: notices "physical_edition INSERT ok" + "revertido" (sin error de constraint).

- [ ] **Step 5: Commit del archivo de migración**

```bash
git add leyendas-de-bacalar/backend/supabase/migrations/20260716_hotspots_physical_edition.sql
git commit -m "feat(db): allow physical_edition target_type on interactive_hotspots"
```

---

### Task 2: Backend — funciones de servicio para marcadores físicos

**Files:**
- Modify: `leyendas-de-bacalar/backend/src/services/interactiveHotspots.service.js` (agregar al final, reutiliza helpers privados existentes: `assertAssetInLegend`, `createScene`, `linkPhysicalEditionMarker`, `loadHotspot`, `getLegendAccessContext`, `HotspotError`, `supabaseAdmin`)

- [ ] **Step 1: Agregar el bloque de "physical markers" al final del archivo**

```js
// ---------------------------------------------------------------------------
// Physical-edition markers (marcador de libro fisico, independiente de pagina).
// Se guardan como interactive_hotspots con target_type='physical_edition'
// (page_id y source_document_id nulos). La app movil ya lee esa tabla, asi que
// aparecen en el escaner sin cambios en el APK. Se publican al instante; el feed
// movil igual exige que la leyenda este publicada.
// ---------------------------------------------------------------------------
const PHYSICAL_TARGET = 'physical_edition';

const PHYSICAL_MARKER_SELECT =
  'id, legend_id, marker_asset_id, ar_scene_id, label, status, created_at, ' +
  'marker:marker_asset_id(id, file_url, metadata), ' +
  'scene:ar_scene_id(id, name, model:model_asset_id(id, file_url, metadata))';

const modelName = (asset, sceneName) =>
  asset?.metadata?.original_name || asset?.metadata?.filename || sceneName || 'Modelo 3D';

const serializePhysicalMarker = (row) => {
  const modelAsset = row.scene?.model || null;
  return {
    id: row.id,
    legendId: row.legend_id,
    status: row.status,
    label: row.label,
    createdAt: row.created_at,
    marker: {
      assetId: row.marker_asset_id,
      imageUrl: row.marker?.file_url || null,
      name: row.marker?.metadata?.original_name || row.marker?.metadata?.filename || 'Marcador',
    },
    model: {
      sceneId: row.ar_scene_id,
      assetId: modelAsset?.id || null,
      url: modelAsset?.file_url || null,
      name: modelName(modelAsset, row.scene?.name),
    },
  };
};

export const listPhysicalMarkers = async ({ legendId, userId, roles }) => {
  await getLegendAccessContext({ legendId, userId, roles });
  const { data, error } = await supabaseAdmin
    .from('interactive_hotspots')
    .select(PHYSICAL_MARKER_SELECT)
    .eq('legend_id', legendId)
    .eq('target_type', PHYSICAL_TARGET)
    .order('created_at', { ascending: true });
  if (error) throw new HotspotError('Could not list physical markers.', 500, { reason: error.message });
  return (data ?? []).map(serializePhysicalMarker);
};

export const createPhysicalMarker = async ({ legendId, userId, roles, payload = {} }) => {
  await getLegendAccessContext({ legendId, userId, roles });

  const markerAssetId = payload.marker_asset_id;
  const modelAssetId = payload.model_asset_id;
  if (!markerAssetId) throw new HotspotError('marker_asset_id is required.', 400);
  if (!modelAssetId) throw new HotspotError('model_asset_id is required.', 400);
  await assertAssetInLegend(legendId, markerAssetId);
  await assertAssetInLegend(legendId, modelAssetId);

  // Unicidad: un marcador se vincula a un solo modelo por leyenda.
  const { data: clash, error: clashError } = await supabaseAdmin
    .from('interactive_hotspots')
    .select('id')
    .eq('legend_id', legendId)
    .eq('target_type', PHYSICAL_TARGET)
    .eq('marker_asset_id', markerAssetId)
    .maybeSingle();
  if (clashError) throw new HotspotError('Could not validate marker uniqueness.', 500, { reason: clashError.message });
  if (clash) throw new HotspotError('Ese marcador ya esta vinculado a un modelo en esta leyenda.', 409);

  // La escena enlaza el modelo (idempotente por model_asset_id).
  const scene = await createScene({
    legendId,
    userId,
    roles,
    payload: { model_asset_id: modelAssetId, name: payload.label || 'Modelo (libro fisico)' },
  });

  const label = payload.label ? String(payload.label).slice(0, 200) : null;
  const record = {
    legend_id: legendId,
    target_type: PHYSICAL_TARGET,
    hotspot_type: 'model',
    marker_asset_id: markerAssetId,
    ar_scene_id: scene.id,
    label,
    x: 0.5,
    y: 0.5,
    status: 'published',
    created_by: userId,
  };
  const { data, error } = await supabaseAdmin
    .from('interactive_hotspots')
    .insert(record)
    .select(PHYSICAL_MARKER_SELECT)
    .single();
  if (error || !data) throw new HotspotError('Could not create physical marker.', 500, { reason: error?.message });

  // Registro edicion fisica <-> marcador (best-effort; no debe romper la creacion).
  // page_reference es NOT NULL en physical_edition_markers -> siempre pasamos un valor.
  try {
    await linkPhysicalEditionMarker({
      legendId,
      userId,
      roles,
      payload: {
        marker_asset_id: markerAssetId,
        ar_scene_id: scene.id,
        page_reference: payload.page_reference ? String(payload.page_reference) : 'libro-fisico',
      },
    });
  } catch {
    // El mapeo escaneable (hotspot) ya existe; el registro fisico es secundario.
  }

  return serializePhysicalMarker(data);
};

export const deletePhysicalMarker = async ({ legendId, hotspotId, userId, roles }) => {
  const existing = await loadHotspot(hotspotId);
  if (String(existing.legend_id) !== String(legendId) || existing.target_type !== PHYSICAL_TARGET) {
    throw new HotspotError('Physical marker not found for this legend.', 404);
  }
  await getLegendAccessContext({ legendId, userId, roles });
  const { error } = await supabaseAdmin
    .from('interactive_hotspots')
    .delete()
    .eq('id', hotspotId);
  if (error) throw new HotspotError('Could not delete physical marker.', 500, { reason: error.message });
  return { id: hotspotId };
};
```

- [ ] **Step 2: `node --check` del servicio**

Run: `cd leyendas-de-bacalar/backend && node --check src/services/interactiveHotspots.service.js`
Expected: sin salida (exit 0).

- [ ] **Step 3: Commit**

```bash
git add leyendas-de-bacalar/backend/src/services/interactiveHotspots.service.js
git commit -m "feat(backend): physical-marker service (create/list/delete) reusing hotspot helpers"
```

---

### Task 3: Backend — rutas `/physical-markers`

**Files:**
- Modify: `leyendas-de-bacalar/backend/src/routes/legendHotspots.routes.js`

- [ ] **Step 1: Importar las nuevas funciones**

En el bloque de import de `../services/interactiveHotspots.service.js`, agregar `createPhysicalMarker`, `deletePhysicalMarker`, `listPhysicalMarkers` (orden alfabético en la lista existente):

```js
import {
  createHotspot,
  createMarker,
  createPhysicalMarker,
  createScene,
  deleteHotspot,
  deletePhysicalMarker,
  linkPhysicalEditionMarker,
  listHotspots,
  listPhysicalMarkers,
  listScenes,
  updateHotspot,
} from '../services/interactiveHotspots.service.js';
```

- [ ] **Step 2: Agregar las tres rutas (antes de `export default router;`)**

```js
router.get('/:legendId/physical-markers', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const markers = await listPhysicalMarkers({
      legendId: req.params.legendId,
      userId: req.user.id,
      roles: req.user.roles,
    });
    res.json({ ok: true, markers });
  } catch (error) {
    next(error);
  }
});

router.post('/:legendId/physical-markers', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const marker = await createPhysicalMarker({
      legendId: req.params.legendId,
      userId: req.user.id,
      roles: req.user.roles,
      payload: req.body ?? {},
    });
    res.status(201).json({ ok: true, marker });
  } catch (error) {
    next(error);
  }
});

router.delete('/:legendId/physical-markers/:hotspotId', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const result = await deletePhysicalMarker({
      legendId: req.params.legendId,
      hotspotId: req.params.hotspotId,
      userId: req.user.id,
      roles: req.user.roles,
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 3: Build backend completo (`node --check` de toda la lista)**

Run: `cd leyendas-de-bacalar/backend && npm.cmd run build`
Expected: exit 0 (los dos archivos tocados ya están en la lista `build`; no hay archivo nuevo que registrar).

- [ ] **Step 4: Commit**

```bash
git add leyendas-de-bacalar/backend/src/routes/legendHotspots.routes.js
git commit -m "feat(backend): GET/POST/DELETE /legends/:id/physical-markers routes"
```

---

### Task 4: Frontend — funciones de servicio API

**Files:**
- Modify: `leyendas-de-bacalar/frontend/src/services/backendApiService.js` (junto a los otros helpers de hotspots, después de `deleteLegendHotspot`)

- [ ] **Step 1: Agregar las tres funciones**

```js
// Marcadores de libro fisico (independientes de pagina). El backend los guarda como
// interactive_hotspots target_type='physical_edition' publicados -> la app movil los
// escanea sin recompilar. Devuelven { ok, markers } / { ok, marker } / { ok, id }.
export function listLegendPhysicalMarkers(legendId) {
  return requestBackend(`/api/v1/legends/${encodeURIComponent(legendId)}/physical-markers`, {
    operation: 'list-physical-markers',
  });
}

export function createLegendPhysicalMarker(legendId, payload) {
  return requestBackend(`/api/v1/legends/${encodeURIComponent(legendId)}/physical-markers`, {
    method: 'POST',
    operation: 'create-physical-marker',
    body: payload,
  });
}

export function deleteLegendPhysicalMarker(legendId, hotspotId) {
  return requestBackend(
    `/api/v1/legends/${encodeURIComponent(legendId)}/physical-markers/${encodeURIComponent(hotspotId)}`,
    { method: 'DELETE', operation: 'delete-physical-marker' },
  );
}
```

- [ ] **Step 2: Lint del archivo**

Run: `cd leyendas-de-bacalar/frontend && npx eslint src/services/backendApiService.js --max-warnings 0`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add leyendas-de-bacalar/frontend/src/services/backendApiService.js
git commit -m "feat(frontend): backend API helpers for physical markers"
```

---

### Task 5: Frontend — página `PhysicalMarkersPage.jsx`

**Files:**
- Create: `leyendas-de-bacalar/frontend/src/pages/creator/PhysicalMarkersPage.jsx`

Contexto de APIs usadas:
- `getMyLegends()` (de `creatorService.js`) → `{ data: [{id,title,status,short_synopsis,slug}], error }`.
- `getLegendStatusBadge(legend)` → `{ key, label }`.
- `uploadLegendAsset({ file, legendId, assetType })` (de `assetService.js`) → `{ data: { asset }, error }`; el id del asset es `data.asset.id`. `assetType` ∈ `'marker_image' | 'model_3d'`.
- `listLegendPhysicalMarkers` / `createLegendPhysicalMarker` / `deleteLegendPhysicalMarker` (Task 4). List → `resp.markers`; create → `resp.marker`.
- Componentes UI: `Card`, `Button`, `LoadingState`, `StatusBadge`. Clases: `page-stack creator-panel`, `creator-kicker`, `error-message`, `state-message`.

- [ ] **Step 1: Crear el componente completo**

```jsx
import React, { useEffect, useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import StatusBadge from '../../components/creator/StatusBadge.jsx';
import { getMyLegends, getLegendStatusBadge } from '../../services/creatorService.js';
import { uploadLegendAsset } from '../../services/assetService.js';
import {
  listLegendPhysicalMarkers,
  createLegendPhysicalMarker,
  deleteLegendPhysicalMarker,
} from '../../services/backendApiService.js';

const EMPTY_FORM = { markerFile: null, modelFile: null, label: '' };

function PhysicalMarkersPage() {
  const [legends, setLegends] = useState([]);
  const [selectedLegendId, setSelectedLegendId] = useState('');
  const [markers, setMarkers] = useState([]);
  const [loadingLegends, setLoadingLegends] = useState(true);
  const [loadingMarkers, setLoadingMarkers] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const selectedLegend = legends.find((legend) => String(legend.id) === String(selectedLegendId)) || null;
  const legendPublished = String(selectedLegend?.status || '') === 'published';

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: legendsError } = await getMyLegends();
      if (!active) return;
      setLegends(data ?? []);
      if (legendsError) setError(legendsError.message || 'No se pudieron cargar tus leyendas.');
      setLoadingLegends(false);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedLegendId) { setMarkers([]); return undefined; }
    let active = true;
    setLoadingMarkers(true);
    setError(null);
    (async () => {
      try {
        const resp = await listLegendPhysicalMarkers(selectedLegendId);
        if (active) setMarkers(resp?.markers ?? []);
      } catch (err) {
        if (active) setError(err?.message || 'No se pudieron cargar los marcadores.');
      } finally {
        if (active) setLoadingMarkers(false);
      }
    })();
    return () => { active = false; };
  }, [selectedLegendId]);

  async function handleSave(event) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!selectedLegendId) { setError('Selecciona una leyenda.'); return; }
    if (!form.markerFile) { setError('Sube la imagen del marcador.'); return; }
    if (!form.modelFile) { setError('Sube el modelo 3D (.glb).'); return; }

    setSaving(true);
    try {
      const markerUpload = await uploadLegendAsset({
        file: form.markerFile, legendId: selectedLegendId, assetType: 'marker_image',
      });
      if (markerUpload.error) throw new Error(markerUpload.error.message || 'No se pudo subir el marcador.');

      const modelUpload = await uploadLegendAsset({
        file: form.modelFile, legendId: selectedLegendId, assetType: 'model_3d',
      });
      if (modelUpload.error) throw new Error(modelUpload.error.message || 'No se pudo subir el modelo.');

      const resp = await createLegendPhysicalMarker(selectedLegendId, {
        marker_asset_id: markerUpload.data.asset.id,
        model_asset_id: modelUpload.data.asset.id,
        label: form.label.trim() || null,
      });
      setMarkers((prev) => [...prev, resp.marker]);
      setForm(EMPTY_FORM);
      setNotice('Par marcador-modelo guardado.');
    } catch (err) {
      setError(err?.message || 'No se pudo guardar el par marcador-modelo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(hotspotId) {
    setError(null);
    setNotice(null);
    try {
      await deleteLegendPhysicalMarker(selectedLegendId, hotspotId);
      setMarkers((prev) => prev.filter((marker) => String(marker.id) !== String(hotspotId)));
    } catch (err) {
      setError(err?.message || 'No se pudo eliminar.');
    }
  }

  if (loadingLegends) return <LoadingState message="Cargando tus leyendas..." />;

  return (
    <section className="page-stack creator-panel">
      <div>
        <p className="creator-kicker">Libro físico · App móvil</p>
        <h1>Marcadores para la app</h1>
        <p className="state-message">
          Registra los marcadores de tu <strong>libro físico</strong> y vincúlalos a su modelo 3D.
          Al escanear el marcador impreso con la app, aparece el modelo. Cada leyenda tiene su
          propia lista; cada marcador va con un solo modelo.
        </p>
      </div>

      <Card>
        <label className="field-label" htmlFor="pm-legend">Leyenda</label>
        <select
          id="pm-legend"
          className="input"
          value={selectedLegendId}
          onChange={(event) => { setSelectedLegendId(event.target.value); setNotice(null); setError(null); }}
        >
          <option value="">— Selecciona una leyenda —</option>
          {legends.map((legend) => (
            <option key={legend.id} value={legend.id}>{legend.title}</option>
          ))}
        </select>
        {selectedLegend && !legendPublished && (
          <p className="state-message" style={{ marginTop: '0.5rem' }}>
            Esta leyenda no está publicada todavía: los marcadores se guardan, pero se activarán
            en la app cuando la publiques.
          </p>
        )}
      </Card>

      {error && <p className="error-message">{error}</p>}
      {notice && <p className="state-message" role="status">{notice}</p>}

      {selectedLegendId && (
        <>
          <Card>
            <h2>Agregar par marcador ↔ modelo</h2>
            <form className="page-stack" onSubmit={handleSave}>
              <div>
                <label className="field-label" htmlFor="pm-marker">Imagen del marcador</label>
                <input
                  id="pm-marker"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setForm((prev) => ({ ...prev, markerFile: event.target.files?.[0] || null }))}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="pm-model">Modelo 3D (.glb)</label>
                <input
                  id="pm-model"
                  type="file"
                  accept=".glb,model/gltf-binary"
                  onChange={(event) => setForm((prev) => ({ ...prev, modelFile: event.target.files?.[0] || null }))}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="pm-label">Nombre (opcional)</label>
                <input
                  id="pm-label"
                  className="input"
                  type="text"
                  placeholder="Ej. Pirata, Iglesia..."
                  value={form.label}
                  onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                />
              </div>
              <div>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar par'}
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <h2>Marcadores de esta leyenda</h2>
            {loadingMarkers ? (
              <LoadingState message="Cargando marcadores..." />
            ) : markers.length === 0 ? (
              <p className="state-message">Aún no hay marcadores para esta leyenda.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Marcador</th>
                    <th>Modelo</th>
                    <th>Estado</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {markers.map((marker) => (
                    <tr key={marker.id}>
                      <td>
                        {marker.marker.imageUrl ? (
                          <img
                            src={marker.marker.imageUrl}
                            alt={marker.marker.name}
                            style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }}
                          />
                        ) : (
                          <span className="state-message">{marker.marker.name}</span>
                        )}
                      </td>
                      <td>{marker.label || marker.model.name}</td>
                      <td><StatusBadge statusKey={marker.status} label={marker.status} /></td>
                      <td>
                        <Button variant="ghost" onClick={() => handleDelete(marker.id)}>Eliminar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}

      {!legends.length && (
        <Card className="creator-empty-card">
          <h2>Aún no tienes leyendas</h2>
          <p>Crea una obra para poder registrar sus marcadores de libro físico.</p>
        </Card>
      )}
    </section>
  );
}

export default PhysicalMarkersPage;
```

- [ ] **Step 2: Lint del componente**

Run: `cd leyendas-de-bacalar/frontend && npx eslint src/pages/creator/PhysicalMarkersPage.jsx --max-warnings 0`
Expected: sin errores. (Si `.data-table` / `.field-label` / `.input` no existieran como clases, igual renderiza; se afinan en el pulido visual — no bloquean lint.)

- [ ] **Step 3: Commit**

```bash
git add leyendas-de-bacalar/frontend/src/pages/creator/PhysicalMarkersPage.jsx
git commit -m "feat(frontend): PhysicalMarkersPage (legend selector + per-legend table + upload form)"
```

---

### Task 6: Frontend — cablear ruta + sidebar

**Files:**
- Modify: `leyendas-de-bacalar/frontend/src/app/router.jsx`
- Modify: `leyendas-de-bacalar/frontend/src/layouts/CreatorLayout.jsx`

- [ ] **Step 1: Import lazy en `router.jsx`** (junto a los otros `const ...Creator... = lazy(...)`)

```jsx
const PhysicalMarkersPage = lazy(() => import('../pages/creator/PhysicalMarkersPage.jsx'));
```

- [ ] **Step 2: Ruta hija en el bloque `/creator`** (después de `{ path: 'code-requests', element: <CodeRequestsPage /> },`)

```jsx
              { path: 'physical-markers', element: <PhysicalMarkersPage /> },
```

- [ ] **Step 3: Ítem de sidebar en `CreatorLayout.jsx`** (agregar al arreglo `creatorItems`, antes de "Mi perfil")

```jsx
  { label: 'Marcadores para app', to: '/creator/physical-markers', icon: 'add_to_home_screen' },
```

- [ ] **Step 4: Lint de ambos archivos**

Run: `cd leyendas-de-bacalar/frontend && npx eslint src/app/router.jsx src/layouts/CreatorLayout.jsx --max-warnings 0`
Expected: sin errores.

- [ ] **Step 5: Build frontend**

Run: `cd leyendas-de-bacalar/frontend && npm.cmd run build`
Expected: exit 0. Si falla por OneDrive/Vite en sandbox (CLAUDE.md §13), reintentar fuera del sandbox y reportar. No tocar `node_modules`.

- [ ] **Step 6: Commit**

```bash
git add leyendas-de-bacalar/frontend/src/app/router.jsx leyendas-de-bacalar/frontend/src/layouts/CreatorLayout.jsx
git commit -m "feat(frontend): route + creator sidebar entry for physical markers"
```

---

### Task 7: Verificación E2E (DB + feed móvil)

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Confirmar que un marcador físico creado aparece en el feed que lee la app**

Después de crear un par por la UI (o insertando uno de prueba service-role), correr el mismo SELECT que usa `arScenes.js`/`mobileAr.service.js` (MCP `execute_sql`):

```sql
select h.id, h.status, h.target_type, l.title, l.status as legend_status,
       ma.file_url as marker_url, mo.file_url as model_url
from public.interactive_hotspots h
join public.legends l on l.id = h.legend_id
left join public.assets ma on ma.id = h.marker_asset_id
left join public.ar_scenes s on s.id = h.ar_scene_id
left join public.assets mo on mo.id = s.model_asset_id
where h.target_type = 'physical_edition';
```
Esperado: la fila creada con `status='published'`, `marker_url` y `model_url` no nulos. (Aparece en la app solo si `legend_status='published'`.)

- [ ] **Step 2: Confirmar que el lector web no se rompe con hotspots physical_edition**

Verificar que `readerBundle.service.js` (que carga hotspots por `legend_id`) no falla con `page_id`/`source_document_id` nulos: un hotspot `physical_edition` no hace match con ninguna página → no se renderiza en el lector web (comportamiento correcto). Revisar `serializeHotspot` + los matchers de página en `readerBundle.service.js` y `utils/readerPages.js` para confirmar que toleran nulos (no lanzan).

- [ ] **Step 3: Reporte** — dejar constancia de lo verificado y lo que requiere sesión real (subida de archivo con login) que no pudo probarse headless.

---

### Task 8: Memoria + cierre

**Files:** memoria del proyecto.

- [ ] **Step 1: Actualizar memoria**

Crear/editar una memoria que registre: la sección `/creator/physical-markers`, el `target_type='physical_edition'` en `interactive_hotspots` (migración `20260716`), que la app móvil no requiere cambios, y el enlace con [[mobile-scan-and-manual-markers]] y [[ar-state-actual]]. Agregar línea en `MEMORY.md`.

- [ ] **Step 2: Reporte final** en el formato de CLAUDE.md §22 (resumen, causa/decisión, archivos, confirmaciones de "no toqué X", builds, pruebas, SQL aplicado, `git status --short`, `git diff --stat`, pendientes, riesgos).

---

## Self-Review (cobertura del spec)

- §4.1 DB → Task 1. ✅
- §4.2 Backend service (create/list/delete, unicidad, publish instantáneo, link best-effort) → Task 2. ✅
- §4.2 Rutas → Task 3. ✅
- §4.3 Frontend service → Task 4; página (selector + tabla por leyenda + form + aviso no-publicada) → Task 5; router + sidebar (ícono `add_to_home_screen`) → Task 6. ✅
- §4.4 App móvil sin cambios → verificado en Task 7. ✅
- §6 Unicidad/aislamiento → Task 2 (check 409) + Task 5 (filtro por leyenda). ✅
- §9 Verificación → Tasks 3/6 (build/lint) + Task 7 (DB/feed). ✅
- Consistencia de nombres: `listPhysicalMarkers/createPhysicalMarker/deletePhysicalMarker` (backend) ↔ `listLegendPhysicalMarkers/createLegendPhysicalMarker/deleteLegendPhysicalMarker` (frontend) ↔ respuesta `{ markers } / { marker } / { id }`. Asset id = `upload.data.asset.id`. ✅
- Sin placeholders (todo el código está completo). ✅
