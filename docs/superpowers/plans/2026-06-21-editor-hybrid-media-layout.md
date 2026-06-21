# Editor Hybrid Media Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir imágenes, modelos 3D y marcadores de Editor.js en objetos editoriales híbridos con modos inline, ajuste de texto y posición libre, sin canvas visible.

**Architecture:** Cada recurso conserva su bloque Editor.js como ancla y fuente de persistencia. El propio `.ce-block` cambia de estrategia visual: flujo normal para `inline`, float para `wrap-left/right` y posición absoluta relativa al redactor para `free`. Una vista React compartida aporta selección, resize, recorte y menú contextual, mientras el JSON sigue viviendo en cada bloque multimedia.

**Tech Stack:** React 18, Editor.js, Pointer Events, React portals, Three.js, `@react-three/fiber`, `@react-three/drei`, CSS, Node test runner.

**Project constraints:** No hacer commit, no instalar dependencias, no tocar backend, DB, RLS, `.env`, Storage, PDF, CONALITEG, hotspots ni deploy.

---

## File Map

**Create**

- `leyendas-de-bacalar/frontend/src/components/creator/editor-media/mediaLayoutState.js` — contrato, normalización, geometría, crop y migración.
- `leyendas-de-bacalar/frontend/src/components/creator/editor-media/mediaLayoutState.test.mjs` — pruebas TDD del contrato.
- `leyendas-de-bacalar/frontend/src/components/creator/editor-media/MediaObjectView.jsx` — vista compartida del recurso.
- `leyendas-de-bacalar/frontend/src/components/creator/editor-media/MediaContextMenu.jsx` — menú por selección/clic derecho mediante portal.
- `leyendas-de-bacalar/frontend/src/components/creator/editor-media/MediaCropOverlay.jsx` — edición no destructiva del recorte.
- `leyendas-de-bacalar/frontend/src/components/creator/editor-media/mediaDomLayout.js` — aplicación y cleanup de clases/estilos sobre `.ce-block`.
- `leyendas-de-bacalar/frontend/src/components/creator/editor-media/mediaDomLayout.test.mjs` — contrato de estilos serializables.

**Modify**

- `leyendas-de-bacalar/frontend/src/components/creator/editorBlockTools.js`
- `leyendas-de-bacalar/frontend/src/components/creator/editorBlockTools.test.mjs`
- `leyendas-de-bacalar/frontend/src/components/creator/EditorialRichEditor.jsx`
- `leyendas-de-bacalar/frontend/src/components/creator/EditorJsToolbar.jsx`
- `leyendas-de-bacalar/frontend/src/components/creator/EditorJsPreview.jsx`
- `leyendas-de-bacalar/frontend/src/components/3d/Model3DViewer.jsx`
- `leyendas-de-bacalar/frontend/src/utils/editorJsToHtml.js`
- `leyendas-de-bacalar/frontend/src/utils/editorJsToHtml.test.mjs`
- `leyendas-de-bacalar/frontend/src/styles/index.css`

**Remove after migration verification**

- `leyendas-de-bacalar/frontend/src/components/creator/editor-composition/CompositionCanvas.jsx`
- `leyendas-de-bacalar/frontend/src/components/creator/editor-composition/CompositionLayer.jsx`
- `leyendas-de-bacalar/frontend/src/components/creator/editor-composition/CompositionPreview.jsx`
- `leyendas-de-bacalar/frontend/src/components/creator/editor-composition/compositionState.js`
- `leyendas-de-bacalar/frontend/src/components/creator/editor-composition/compositionState.test.mjs`
- `leyendas-de-bacalar/frontend/src/components/creator/editor-tools/CompositionBlockTool.js`
- `leyendas-de-bacalar/frontend/src/components/creator/editor-tools/CompositionBlockTool.test.mjs`

---

### Task 1: Hybrid media JSON contract

**Files**

- Create: `frontend/src/components/creator/editor-media/mediaLayoutState.test.mjs`
- Create: `frontend/src/components/creator/editor-media/mediaLayoutState.js`

- [ ] **Step 1: Write failing normalization tests**

Test:

```js
const layout = normalizeMediaLayout({
  mode: 'invalid',
  x: -100,
  y: -20,
  width: 5000,
  height: 10,
  layer: 'invalid',
  zIndex: -2,
  opacity: 4,
  crop: { x: -1, y: 2, width: 0, height: 5, zoom: 0 },
}, { kind: 'image', sheetWidth: 1120 });

assert.equal(layout.mode, 'inline');
assert.equal(layout.width, 1120);
assert.equal(layout.height, 48);
assert.equal(layout.layer, 'above-text');
assert.equal(layout.zIndex, 1);
assert.equal(layout.opacity, 1);
assert.deepEqual(layout.crop, { x: 0, y: 0, width: 1, height: 1, zoom: 1 });
```

Also verify:

- supported modes: `inline`, `wrap-left`, `wrap-right`, `free`;
- supported text layers: `above-text`, `behind-text`;
- legacy `{width,height,align}` becomes `inline`;
- `anchorBlockId` is preserved or generated;
- model layouts omit crop behavior but remain serializable;
- safe URL and asset fields remain outside layout.

- [ ] **Step 2: Run and verify RED**

```powershell
cd leyendas-de-bacalar/frontend
node --test src/components/creator/editor-media/mediaLayoutState.test.mjs
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement constants and normalization**

Export:

```js
export const MEDIA_SHEET_WIDTH = 1120;
export const MEDIA_MIN_SIZE = 48;
export const MEDIA_MODES = new Set(['inline', 'wrap-left', 'wrap-right', 'free']);
export const MEDIA_TEXT_LAYERS = new Set(['above-text', 'behind-text']);

export function normalizeCrop(crop = {}) {}
export function normalizeMediaLayout(layout = {}, options = {}) {}
```

Defaults:

```js
{
  mode: 'inline',
  anchorBlockId: generatedId,
  x: 0,
  y: 0,
  width: kind === 'marker' ? 180 : 520,
  height: kind === 'model3d' ? 360 : 'auto',
  align: 'center',
  layer: 'above-text',
  zIndex: 1,
  locked: false,
  opacity: 1,
  crop: { x: 0, y: 0, width: 1, height: 1, zoom: 1 }
}
```

- [ ] **Step 4: Run and verify GREEN**

Expected: normalization tests pass.

- [ ] **Step 5: Write failing operation tests**

Cover:

```js
setMediaMode(layout, mode)
moveFreeMedia(layout, position, sheetMetrics)
resizeMedia(layout, geometry, sheetMetrics)
setTextLayer(layout, layer)
bringMediaForward(layout, highestZ)
sendMediaBackward(layout, lowestZ)
setMediaLocked(layout, locked)
setMediaOpacity(layout, opacity)
applyCropPan(layout, delta)
applyCropZoom(layout, zoom)
resetCrop(layout)
```

Requirements:

- movement only changes `free`;
- locked resources reject movement, resize and crop;
- switching from free to wrap clears irrelevant x/y but preserves size;
- switching to free receives initial x/y from anchor geometry;
- crop never exposes an empty frame;
- marker/image support crop; model ignores it.

- [ ] **Step 6: Run and verify RED**

Expected: FAIL because operations are absent.

- [ ] **Step 7: Implement immutable operations**

Each function returns normalized new data and never mutates input.

- [ ] **Step 8: Run and verify GREEN**

Expected: all media layout tests pass.

---

### Task 2: Safe migration from old composition blocks

**Files**

- Modify: `frontend/src/components/creator/editor-media/mediaLayoutState.test.mjs`
- Modify: `frontend/src/components/creator/editor-media/mediaLayoutState.js`

- [ ] **Step 1: Write failing migration tests**

Input:

```js
{
  type: 'composition',
  data: {
    canvas: { width: 900, height: 560 },
    layers: [
      {
        id: 'image-layer',
        type: 'image',
        assetId: 'asset-image',
        url: 'https://example.com/cave.png',
        x: 120,
        y: 80,
        width: 300,
        height: 220,
        zIndex: 1,
        opacity: 0.8,
        locked: false
      },
      {
        id: 'model-layer',
        type: 'model3d',
        assetId: 'asset-model',
        url: 'https://example.com/bear.glb',
        x: 360,
        y: 160,
        width: 260,
        height: 260,
        zIndex: 2
      }
    ]
  }
}
```

Expected:

- two blocks: `image` and `model3d`;
- `mode: free`;
- coordinates scaled from 900 to logical width 1120;
- URL placed in `file.url`, `modelUrl` or `imageUrl`;
- asset ID, opacity, lock and z-index preserved;
- invalid layers return `{ converted: false, originalBlock }`.

- [ ] **Step 2: Run and verify RED**

Expected: `migrateCompositionBlock` missing.

- [ ] **Step 3: Implement migration**

Export:

```js
export function migrateCompositionBlock(block, createId) {
  return {
    converted: boolean,
    blocks: [],
    originalBlock: block
  };
}

export function migrateEditorDataMedia(editorData, createId) {}
```

The migration must be idempotent. Existing non-composition blocks remain unchanged.

- [ ] **Step 4: Run and verify GREEN**

Expected: migration tests pass.

---

### Task 3: DOM strategy for inline, wrap and free

**Files**

- Create: `frontend/src/components/creator/editor-media/mediaDomLayout.test.mjs`
- Create: `frontend/src/components/creator/editor-media/mediaDomLayout.js`

- [ ] **Step 1: Write failing style-contract tests**

Test pure output:

```js
assert.deepEqual(getMediaBlockPresentation({
  mode: 'wrap-left',
  width: 320,
  height: 220,
  layer: 'above-text',
  zIndex: 2,
}), {
  blockClass: 'ejs-media-block ejs-media-block--wrap-left ejs-media-block--above-text',
  blockStyle: {
    width: '320px',
    height: '220px',
    float: 'left',
    margin: '0 24px 16px 0',
    zIndex: '2'
  }
});
```

Also test:

- wrap-right;
- inline alignment;
- free absolute coordinates scaled to rendered sheet width;
- behind-text z-index band;
- cleanup returns every mutated property.

- [ ] **Step 2: Run and verify RED**

Expected: module missing.

- [ ] **Step 3: Implement presentation helpers**

Export:

```js
export function getMediaBlockPresentation(layout, metrics = {}) {}
export function applyMediaBlockPresentation(blockElement, layout, metrics = {}) {}
export function clearMediaBlockPresentation(blockElement) {}
```

Rules:

- mutate only the media block's closest `.ce-block`;
- set `data-media-anchor`;
- redactor gets `position: relative` and `overflow: visible`;
- free uses `position: absolute`;
- wrap uses float on `.ce-block`;
- inline stays in normal flow;
- cleanup removes only classes/styles owned by this feature.

- [ ] **Step 4: Run and verify GREEN**

Expected: DOM presentation tests pass.

---

### Task 4: Context menu

**Files**

- Create: `frontend/src/components/creator/editor-media/MediaContextMenu.jsx`

- [ ] **Step 1: Implement menu contract**

Props:

```jsx
<MediaContextMenu
  open={open}
  position={{ x, y }}
  kind="image"
  layout={layout}
  onAction={handleAction}
  onClose={closeMenu}
/>
```

Actions:

```txt
mode:inline
mode:wrap-left
mode:wrap-right
mode:free
layer:above-text
layer:behind-text
order:front
order:back
crop
duplicate
lock
delete
model:move
model:interact
```

- [ ] **Step 2: Implement portal and positioning**

Use `createPortal(..., document.body)`.

Clamp menu:

```js
left = min(pointerX, viewportWidth - menuWidth - 12)
top = min(pointerY, viewportHeight - menuHeight - 12)
```

- [ ] **Step 3: Implement close behavior**

- Escape;
- pointer down outside;
- window resize;
- action selection.

Use `role="menu"` and `role="menuitemradio"` for layout modes.

- [ ] **Step 4: Verify no decorative controls**

Crop appears only for image/marker. Model interaction appears only for model.

---

### Task 5: Non-destructive crop

**Files**

- Create: `frontend/src/components/creator/editor-media/MediaCropOverlay.jsx`

- [ ] **Step 1: Implement transactional crop state**

Props:

```jsx
<MediaCropOverlay
  src={url}
  alt={alt}
  frame={{ width, height }}
  crop={layout.crop}
  onApply={apply}
  onCancel={cancel}
/>
```

Keep a draft crop. Do not call parent `onApply` while dragging.

- [ ] **Step 2: Implement pan and zoom**

- Pointer drag pans the image.
- Range input controls `zoom` from 1 to 4.
- Clamp pan through `applyCropPan`.
- Image uses transform-based rendering.

- [ ] **Step 3: Implement apply/cancel**

- Enter applies.
- Escape cancels.
- Buttons `Aplicar` and `Cancelar`.
- Cancel returns exact original crop.

- [ ] **Step 4: Add accessible instructions**

Include concise text:

```txt
Arrastra la imagen para encuadrarla. Usa el control para acercar o alejar.
```

---

### Task 6: Shared media object view

**Files**

- Create: `frontend/src/components/creator/editor-media/MediaObjectView.jsx`

- [ ] **Step 1: Define component contract**

```jsx
<MediaObjectView
  kind="image | marker | model3d"
  data={normalizedBlockData}
  layout={layout}
  readOnly={false}
  onLayoutChange={updateLayout}
  onDelete={deleteBlock}
  onDuplicate={duplicateBlock}
  onModelInteractionChange={setMode}
/>
```

- [ ] **Step 2: Render normal state**

- image/marker: cropped `<img>`;
- model: lazy `Model3DViewer`;
- no outer card, gradient, heading or permanent toolbar;
- only media is visible when not selected.

- [ ] **Step 3: Implement selection**

- click/tap selects;
- context menu selects and opens at pointer;
- outside click deselects;
- selected resource shows thin cyan outline, four resize handles and one options button.

- [ ] **Step 4: Implement drag and resize**

- free mode: drag changes x/y;
- inline/wrap: drag is disabled, but resize remains;
- locked: drag, resize and crop disabled;
- pointer capture;
- scale deltas from rendered sheet to logical width 1120;
- keyboard arrows move free resources.

- [ ] **Step 5: Connect menu actions**

Map every menu action to pure state operations.

- [ ] **Step 6: Connect crop and model modes**

- image/marker opens `MediaCropOverlay`;
- model toggles between `move` and `interact`;
- OrbitControls never steals drag in move mode.

---

### Task 7: Refactor Editor.js media tools

**Files**

- Modify: `frontend/src/components/creator/editorBlockTools.test.mjs`
- Modify: `frontend/src/components/creator/editorBlockTools.js`

- [ ] **Step 1: Write failing normalization tests**

Update expected block data:

```js
layout: {
  mode: 'inline',
  anchorBlockId: 'generated-or-existing',
  x: 0,
  y: 0,
  width: 520,
  height: 'auto',
  align: 'center',
  layer: 'above-text',
  zIndex: 1,
  locked: false,
  opacity: 1,
  crop: { x: 0, y: 0, width: 1, height: 1, zoom: 1 }
}
```

Verify legacy layouts still normalize.

- [ ] **Step 2: Run and verify RED**

Expected: current layout shape does not include hybrid fields.

- [ ] **Step 3: Replace `ResizableBlockView` usage**

Create a shared React mount helper used by:

- `ImageEditorBlockTool`;
- `Model3DBlockTool`;
- `MarkerBlockTool`.

Each tool:

- stores current normalized data;
- mounts `MediaObjectView`;
- applies DOM presentation after mount and every layout update;
- clears styles and unmounts in `destroy`;
- returns complete layout from `save()`.

- [ ] **Step 4: Implement duplicate and delete**

Delete uses current block index.

Duplicate inserts the same tool immediately after the current block with:

- new `anchorBlockId`;
- offset x/y in free mode;
- unlocked state.

- [ ] **Step 5: Run tests and verify GREEN**

Expected: media tool tests pass.

---

### Task 8: Integrate editor and migrate composition data

**Files**

- Modify: `frontend/src/components/creator/EditorialRichEditor.jsx`
- Modify: `frontend/src/components/creator/EditorJsToolbar.jsx`

- [ ] **Step 1: Remove composition toolbar action**

Delete `Composición visual` from `EditorJsToolbar`.

Keep:

- Imagen;
- Modelo 3D;
- Marcador.

- [ ] **Step 2: Remove new composition registration**

Remove `CompositionBlockTool` from `buildTools`.

Keep a temporary legacy tool registration only if required to load old data before migration.

- [ ] **Step 3: Migrate before Editor.js render**

Before passing data to Editor.js:

```js
const normalizedData = migrateEditorDataMedia(page.editor_data);
```

Use it:

- initial editor data;
- page switches;
- preview fallback.

Only persist migrated data after Editor.js successfully renders and saves.

- [ ] **Step 4: Simplify modal insertion**

Image/model/marker modal results always insert their normal media block with hybrid default layout.

Remove `assetTarget`, `compositionAssetRequestRef` and composition-specific resolver paths.

- [ ] **Step 5: Configure sheet metrics**

Pass tool config callbacks:

```js
getSheetMetrics()
onDataChange()
mountInlineModel()
```

`getSheetMetrics` reads the current redactor width and height without storing DOM nodes in JSON.

---

### Task 9: Preview and rendered HTML

**Files**

- Modify: `frontend/src/components/creator/EditorJsPreview.jsx`
- Modify: `frontend/src/utils/editorJsToHtml.test.mjs`
- Modify: `frontend/src/utils/editorJsToHtml.js`

- [ ] **Step 1: Write failing HTML tests**

Test:

- inline image;
- wrap-left and wrap-right;
- free image above text;
- free marker behind text;
- crop metadata;
- free model placeholder;
- no UUID labels;
- no unsafe URL or arbitrary CSS.

- [ ] **Step 2: Run and verify RED**

Expected: current HTML ignores hybrid layout.

- [ ] **Step 3: Implement safe layout styles**

Generate styles only from normalized numeric/enumerated values.

Never pass raw layout strings into HTML.

- [ ] **Step 4: Implement preview sheet layers**

Preview root:

```txt
editorial-content-sheet
├── behind-media-preview
├── text and inline/wrap blocks
└── above-media-preview
```

Free blocks render in the correct layer; their normal block position emits only an anchor.

- [ ] **Step 5: Render crop**

Use a clipped frame and transformed image derived from normalized crop.

- [ ] **Step 6: Preserve model lazy loading**

Free and flow models mount only after `Ver modelo` or viewport visibility according to the current preview policy.

- [ ] **Step 7: Run tests and verify GREEN**

Expected: HTML and existing preview tests pass.

---

### Task 10: Minimal editorial styling

**Files**

- Modify: `frontend/src/styles/index.css`

- [ ] **Step 1: Remove canvas UI**

Delete styles for:

```txt
.ejs-composition
.ejs-composition__topbar
.ejs-composition__viewport
.ejs-composition__stage
.ejs-composition__layers-panel
.ejs-composition__context
```

- [ ] **Step 2: Add sheet layout contexts**

Ensure:

```css
.editorial-editor__surface,
.editorial-editor__holder .codex-editor__redactor {
  position: relative;
  overflow: visible;
}
```

Add:

- text layer context;
- above/behind z-index bands;
- float clearfix at page boundary.

- [ ] **Step 3: Style media selection**

Normal:

- transparent wrapper;
- no border/background/shadow.

Selected:

- 1px cyan outline;
- four small visible handles with 44px hit areas;
- compact options button.

- [ ] **Step 4: Style contextual menu**

- white;
- `border: 1px solid #e5e7eb`;
- radius 8–10px;
- low-opacity diffuse shadow;
- sections and separators;
- no gradients;
- no oversized horizontal toolbar.

- [ ] **Step 5: Style wrap and free modes**

- real float margins;
- free absolute positioning;
- behind-text resources do not block text editing when unselected;
- mobile clamps menu and free resource width.

- [ ] **Step 6: Style crop**

- fixed crop frame;
- subtle dark outside mask;
- compact Apply/Cancel controls;
- no destructive visual effect after cancel.

---

### Task 11: Remove superseded implementation

**Files**

- Delete files listed under “Remove after migration verification”.

- [ ] **Step 1: Verify no active imports**

```powershell
rg -n "CompositionBlockTool|CompositionCanvas|CompositionLayer|CompositionPreview|compositionState" frontend/src
```

Expected: only migration tests or no results.

- [ ] **Step 2: Delete superseded files**

Use `apply_patch` deletions only after migration and new tools pass.

- [ ] **Step 3: Run tests immediately**

Expected: no missing imports.

---

### Task 12: Automated verification

- [ ] **Step 1: Run focused tests**

```powershell
node --test `
  src/components/creator/editor-media/mediaLayoutState.test.mjs `
  src/components/creator/editor-media/mediaDomLayout.test.mjs `
  src/components/creator/editorBlockTools.test.mjs `
  src/components/creator/editor-modals/editorModalUtils.test.mjs `
  src/components/3d/model3dViewerOptions.test.mjs `
  src/services/editorAssetUploadPolicy.test.mjs `
  src/utils/editorJsToHtml.test.mjs
```

Expected: zero failures.

- [ ] **Step 2: Run frontend lint**

```powershell
npm.cmd run lint
```

If it fails because no ESLint configuration exists, report that project-level blocker and do not add config outside scope.

- [ ] **Step 3: Run frontend build**

```powershell
npm.cmd run build
```

If OneDrive blocks Vite inside sandbox, repeat outside sandbox. Expected: exit 0.

- [ ] **Step 4: Confirm no protected changes**

```powershell
git diff --name-only -- leyendas-de-bacalar/backend
git diff --name-only | Select-String -Pattern '(^|/)(\.env|node_modules|backend/supabase)|PDF|Conaliteg|Hotspot'
```

Expected: no output.

---

### Task 13: Manual browser verification

- [ ] **Step 1: Start Vite**

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

- [ ] **Step 2: Verify image workflow**

1. Insert image.
2. Confirm no composition box or permanent toolbar.
3. Select image.
4. Confirm compact controls.
5. Open menu by right click.
6. Change inline → wrap-left → wrap-right.
7. Confirm text truly wraps.
8. Change to free.
9. Drag over text.
10. Change above/behind text.
11. Resize.
12. Crop, cancel and verify rollback.
13. Crop, apply and verify persistence.

- [ ] **Step 3: Verify model and marker**

- marker supports wrap/free/crop;
- model supports wrap/free and move/interact;
- no blue card;
- OrbitControls and drag do not conflict.

- [ ] **Step 4: Verify persistence**

- save;
- reload;
- confirm mode, anchor, x/y, size, crop, z-index, layer, lock and opacity.

- [ ] **Step 5: Verify fullscreen and responsive**

Widths:

- 375;
- 768;
- 1024;
- 1366.

Confirm menu remains visible and free objects stay recoverable.

- [ ] **Step 6: Verify preview**

- no controls;
- real wrap;
- free above/behind text;
- crop reproduced;
- model lazy.

- [ ] **Step 7: Regression smoke**

- paragraph/header/list/checklist/quote/table;
- PDF preview;
- CONALITEG;
- hotspots;
- catalog;
- detail;
- creator panel.

---

### Task 14: Final review

- [ ] **Step 1: Run**

```powershell
git diff --check
git status --short
git diff --stat
```

- [ ] **Step 2: Confirm**

- no commit;
- no deploy;
- no backend;
- no DB/RLS/Storage;
- no `.env`;
- no `node_modules`;
- unrelated `.claude/settings.local.json` preserved.

- [ ] **Step 3: Report evidence**

Report:

- root cause;
- files created/modified/deleted;
- migration behavior;
- test count;
- build;
- exact browser flows observed;
- DB verification status;
- limitations;
- git status and diff stat.
