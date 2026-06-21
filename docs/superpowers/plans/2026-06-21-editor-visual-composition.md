# Editor Visual Composition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un bloque Editor.js `composition` con imagen, modelo 3D y marcador movibles, redimensionables, ordenables y persistentes dentro de un canvas lógico 900×560.

**Architecture:** Editor.js conserva su flujo por bloques. `CompositionBlockTool` monta un árbol React aislado que mantiene el último JSON normalizado en una referencia mutable. Las operaciones geométricas viven en funciones puras testeables; los modales y servicios actuales siguen siendo la única vía para subir y registrar assets.

**Tech Stack:** React 18, Editor.js, Pointer Events, Three.js, `@react-three/fiber`, `@react-three/drei`, CSS existente, Node test runner.

**Project constraint:** No hacer commits, no instalar dependencias, no tocar backend, DB, RLS, `.env`, Storage, PDF, CONALITEG ni deploy.

---

## File Map

**Create**

- `leyendas-de-bacalar/frontend/src/components/creator/editor-composition/compositionState.js` — normalización y operaciones puras.
- `leyendas-de-bacalar/frontend/src/components/creator/editor-composition/compositionState.test.mjs` — pruebas TDD del contrato JSON.
- `leyendas-de-bacalar/frontend/src/components/creator/editor-composition/CompositionLayer.jsx` — capa interactiva Pointer Events.
- `leyendas-de-bacalar/frontend/src/components/creator/editor-composition/CompositionCanvas.jsx` — canvas, selección y toolbars.
- `leyendas-de-bacalar/frontend/src/components/creator/editor-composition/CompositionPreview.jsx` — preview de solo lectura.
- `leyendas-de-bacalar/frontend/src/components/creator/editor-tools/CompositionBlockTool.js` — adaptador Editor.js ↔ React.
- `leyendas-de-bacalar/frontend/src/components/creator/editor-tools/CompositionBlockTool.test.mjs` — serialización y lifecycle básico.

**Modify**

- `leyendas-de-bacalar/frontend/src/components/creator/EditorialRichEditor.jsx`
- `leyendas-de-bacalar/frontend/src/components/creator/EditorJsToolbar.jsx`
- `leyendas-de-bacalar/frontend/src/components/creator/EditorJsPreview.jsx`
- `leyendas-de-bacalar/frontend/src/components/creator/editor-modals/InsertImageModal.jsx`
- `leyendas-de-bacalar/frontend/src/components/creator/editor-modals/InsertModel3DModal.jsx`
- `leyendas-de-bacalar/frontend/src/components/creator/editor-modals/InsertMarkerModal.jsx`
- `leyendas-de-bacalar/frontend/src/components/3d/Model3DViewer.jsx`
- `leyendas-de-bacalar/frontend/src/components/3d/model3dViewerOptions.js`
- `leyendas-de-bacalar/frontend/src/components/3d/model3dViewerOptions.test.mjs`
- `leyendas-de-bacalar/frontend/src/utils/editorJsToHtml.js`
- `leyendas-de-bacalar/frontend/src/utils/editorJsToHtml.test.mjs`
- `leyendas-de-bacalar/frontend/src/styles/index.css`

---

### Task 1: Composition JSON contract

**Files:**

- Create: `leyendas-de-bacalar/frontend/src/components/creator/editor-composition/compositionState.test.mjs`
- Create: `leyendas-de-bacalar/frontend/src/components/creator/editor-composition/compositionState.js`

- [ ] **Step 1: Write failing normalization tests**

Test these behaviors:

```js
test('normalizes canvas and layer geometry into the 900 by 560 logical space', () => {
  const result = normalizeCompositionData({
    canvas: { width: 2000, height: 20, background: 'not-a-color' },
    layers: [{
      id: 'one',
      type: 'image',
      assetId: 'asset-image',
      url: 'https://example.com/cave.png',
      x: -100,
      y: 800,
      width: 2000,
      height: 10,
      zIndex: 99,
      opacity: 4,
    }],
  });

  assert.deepEqual(result.canvas, { width: 900, height: 560, background: '#ffffff' });
  assert.equal(result.layers[0].x, 0);
  assert.equal(result.layers[0].y, 512);
  assert.equal(result.layers[0].width, 900);
  assert.equal(result.layers[0].height, 48);
  assert.equal(result.layers[0].zIndex, 1);
  assert.equal(result.layers[0].opacity, 1);
});
```

Also test:

- unsupported layer types are removed;
- `rotation` clamps to `-180..180`;
- `locked` becomes boolean;
- invalid URLs do not erase a valid `assetId`;
- `getCompositionScale(450)` returns `0.5`;
- `getCompositionScale(1200)` returns `1`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
cd leyendas-de-bacalar/frontend
node --test src/components/creator/editor-composition/compositionState.test.mjs
```

Expected: FAIL because `compositionState.js` does not exist.

- [ ] **Step 3: Implement normalization constants and helpers**

Export:

```js
export const COMPOSITION_WIDTH = 900;
export const COMPOSITION_HEIGHT = 560;
export const MIN_LAYER_SIZE = 48;
export const SUPPORTED_LAYER_TYPES = new Set(['image', 'model3d', 'marker']);

export function normalizeCompositionLayer(layer, index = 0) {}
export function normalizeCompositionData(data = {}) {}
export function getCompositionScale(availableWidth) {}
```

Use finite-number guards, safe color validation for `#rgb`/`#rrggbb`, URL strings only, and sequential `zIndex`.

- [ ] **Step 4: Run tests and verify GREEN**

Expected: all normalization tests pass.

- [ ] **Step 5: Write failing operation tests**

Cover:

```js
moveLayer(data, id, { x, y })
resizeLayer(data, id, { width, height, x, y })
duplicateLayer(data, id, createId)
removeLayer(data, id)
setLayerLocked(data, id, locked)
setLayerOpacity(data, id, opacity)
alignLayer(data, id, 'left' | 'center' | 'right')
bringLayerForward(data, id)
sendLayerBackward(data, id)
addLayer(data, assetPayload, createId)
useLayerAsBackground(data, id)
```

Assertions:

- movement and resize clamp to canvas;
- locked layers do not move or resize;
- duplicate receives new ID, offset, unlocked state and top z-index;
- removing returns normalized z-indexes;
- background fills 900×560, moves to z-index 1 and locks;
- 25/50/100 percent widths can be expressed through `resizeLayer`.

- [ ] **Step 6: Run tests and verify RED**

Expected: FAIL because operations are not exported.

- [ ] **Step 7: Implement minimal immutable operations**

Every operation returns a new normalized composition object and never mutates the input.

- [ ] **Step 8: Run tests and verify GREEN**

Expected: all `compositionState` tests pass.

---

### Task 2: Controlled 3D interaction mode

**Files:**

- Modify: `leyendas-de-bacalar/frontend/src/components/3d/model3dViewerOptions.test.mjs`
- Modify: `leyendas-de-bacalar/frontend/src/components/3d/model3dViewerOptions.js`
- Modify: `leyendas-de-bacalar/frontend/src/components/3d/Model3DViewer.jsx`

- [ ] **Step 1: Write failing option tests**

Add:

```js
test('composition move mode disables model pointer manipulation', () => {
  assert.deepEqual(getOrbitControlOptions({
    embedded: true,
    compactControls: true,
    interactionEnabled: false,
  }), {
    enabled: false,
    enablePan: false,
    enableZoom: false,
    enableRotate: false,
    autoRotate: false,
  });
});

test('composition manipulate mode enables rotate and zoom', () => {
  assert.deepEqual(getOrbitControlOptions({
    embedded: true,
    compactControls: true,
    interactionEnabled: true,
  }), {
    enablePan: false,
    enableZoom: true,
    enableRotate: true,
    autoRotate: false,
  });
});
```

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
node --test src/components/3d/model3dViewerOptions.test.mjs
```

Expected: FAIL because `interactionEnabled` is ignored.

- [ ] **Step 3: Implement controlled options**

Change signature:

```js
getOrbitControlOptions({
  embedded = false,
  compactControls = false,
  interactionEnabled = true,
} = {})
```

Preserve existing reader and inline-editor expectations.

Only include `enabled: false` when interaction is disabled. When interaction is enabled, preserve the current exact object shape so existing callers and tests remain compatible.

- [ ] **Step 4: Pass the prop through the viewer**

Add `interactionEnabled = true` to:

- `Model3DViewer`
- `ModelCanvas`
- `getOrbitControlOptions`

Set the embedded stage class and pointer behavior from this state. Do not change non-embedded modal behavior.

- [ ] **Step 5: Run all 3D option tests**

Expected: existing two tests and new tests pass.

---

### Task 3: Composition layer interaction

**Files:**

- Create: `leyendas-de-bacalar/frontend/src/components/creator/editor-composition/CompositionLayer.jsx`

- [ ] **Step 1: Define the component contract**

Use:

```jsx
<CompositionLayer
  layer={layer}
  scale={scale}
  selected={selected}
  manipulating3d={manipulating3d}
  onSelect={onSelect}
  onMove={onMove}
  onResize={onResize}
  onToggle3d={onToggle3d}
/>
```

- [ ] **Step 2: Implement pointer drag**

Requirements:

- select on pointer down;
- reject if `locked` or `manipulating3d`;
- capture pointer;
- ignore a second active pointer;
- convert visual delta to logical delta with `delta / scale`;
- call `onMove(id, { x, y })`;
- stop propagation so Editor.js does not move focus unexpectedly.

- [ ] **Step 3: Implement corner resize**

Four visible corner handles, each with a 44×44 hit area. Preserve free aspect ratio in this phase; Shift may preserve the current ratio as a progressive enhancement only if it remains isolated.

- [ ] **Step 4: Render layer content**

```txt
image  -> img object-fit: contain
marker -> img object-fit: contain
model3d -> lazy Model3DViewer embedded
```

For model layers:

- placeholder until intersecting;
- no blue card;
- `pointer-events: none` in move mode;
- active OrbitControls in manipulate mode.

- [ ] **Step 5: Add keyboard behavior**

On selected layer:

- arrows move 1;
- Shift + arrows move 10;
- Delete/Backspace invokes delete through the canvas;
- Escape exits 3D mode first, then deselects.

Do not intercept keys from inputs, ranges or buttons.

---

### Task 4: Composition canvas and contextual controls

**Files:**

- Create: `leyendas-de-bacalar/frontend/src/components/creator/editor-composition/CompositionCanvas.jsx`

- [ ] **Step 1: Implement responsive measurement**

Use `ResizeObserver` on the outer wrapper. Compute:

```js
const scale = getCompositionScale(wrapperWidth);
const visualHeight = COMPOSITION_HEIGHT * scale;
```

The logical stage remains 900×560 and uses `transform-origin: top left`.

- [ ] **Step 2: Implement stable top toolbar**

Visible actions:

- `+ Imagen`
- `+ Modelo 3D`
- `+ Marcador`
- color input for solid background
- `Capas`

Each action must call a supplied callback:

```js
onRequestAsset('image' | 'model3d' | 'marker', addResolvedLayer)
```

- [ ] **Step 3: Implement contextual toolbar A**

Show only when a layer is selected. Include:

- move/manipulate 3D toggle;
- duplicate;
- front/back;
- lock;
- left/center/right;
- 25/50/100%;
- opacity range;
- use image as background;
- delete.

Position it from layer geometry, clamp horizontally and move below the layer if top space is insufficient.

- [ ] **Step 4: Implement temporary layers panel**

The panel lists layers by descending z-index, using title and type. Clicking selects the layer. Include:

- visibility remains always on in this phase;
- lock toggle;
- drag reordering is excluded;
- front/back buttons are available.

- [ ] **Step 5: Keep Editor.js save data current**

After every operation:

```js
const next = operation(currentData, ...args);
onChange(next);
```

Do not debounce the in-memory composition update. The outer Editor.js save debounce remains unchanged.

---

### Task 5: Editor.js tool adapter

**Files:**

- Create: `leyendas-de-bacalar/frontend/src/components/creator/editor-tools/CompositionBlockTool.test.mjs`
- Create: `leyendas-de-bacalar/frontend/src/components/creator/editor-tools/CompositionBlockTool.js`

- [ ] **Step 1: Write failing serialization tests**

Test exported helper:

```js
serializeCompositionData(data)
```

Verify:

- canvas is 900×560;
- image/model/marker retain `assetId`, URL, geometry, z-index, rotation, opacity and locked;
- transient UI fields such as selected ID or 3D interaction state are removed.

- [ ] **Step 2: Run and verify RED**

Expected: module missing.

- [ ] **Step 3: Implement the tool**

Tool contract:

```js
static get toolbox()
static get isReadOnlySupported()
constructor({ data, api, config, readOnly })
render()
save()
validate(savedData)
destroy()
static get sanitize()
```

The tool:

- creates a host element;
- mounts `CompositionCanvas` using `createRoot`;
- stores latest data synchronously before calling `config.onDataChange`;
- uses `config.requestAsset`;
- unmounts React in `destroy`.

- [ ] **Step 4: Run tests and verify GREEN**

Expected: serialization tests pass.

---

### Task 6: Connect composition to editor toolbar and modals

**Files:**

- Modify: `leyendas-de-bacalar/frontend/src/components/creator/EditorJsToolbar.jsx`
- Modify: `leyendas-de-bacalar/frontend/src/components/creator/EditorialRichEditor.jsx`
- Modify: the three asset modal files.

- [ ] **Step 1: Add the composition toolbar icon**

Extend `EditorIcon` with a `layers` or `layout` Lucide-style SVG path and add:

```jsx
<ToolbarButton
  label="Composición visual"
  icon="layers"
  onClick={() => onInsertBlock('composition', {
    canvas: { width: 900, height: 560, background: '#ffffff' },
    layers: [],
  })}
/>
```

- [ ] **Step 2: Register the tool**

Import `CompositionBlockTool` and add:

```js
composition: {
  class: CompositionBlockTool,
  toolbox: false,
  config: {
    onDataChange,
    requestAsset,
    mountInlineModel: mountModel,
  },
}
```

- [ ] **Step 3: Add request/resolve state**

In `EditorialRichEditor`, store:

```js
const compositionAssetRequestRef = useRef(null);
const [assetTarget, setAssetTarget] = useState('document');
```

`requestCompositionAsset(kind, resolver)`:

- records resolver;
- sets target to `composition`;
- opens the existing matching modal.

Normal toolbar actions set target to `document`.

- [ ] **Step 4: Generalize modal result payloads**

Each modal continues returning its current data, plus stable asset fields:

```js
{
  assetId,
  title,
  url | modelUrl | imageUrl,
  caption,
  alt
}
```

Do not add target awareness inside the upload logic. The modal remains a resource picker; the parent decides whether the result becomes a document block or composition layer.

- [ ] **Step 5: Resolve insertion target**

For each `handleInsert...`:

```js
if (assetTarget === 'composition' && compositionAssetRequestRef.current) {
  compositionAssetRequestRef.current(normalizedLayerPayload);
  clearCompositionRequest();
  return;
}
```

Otherwise preserve the existing document block insertion unchanged.

- [ ] **Step 6: Verify normal and fullscreen reuse**

Because both pages render `EditorialRichEditor`, no page-level duplicate implementation is allowed.

---

### Task 7: Preview and safe rendered HTML

**Files:**

- Create: `leyendas-de-bacalar/frontend/src/components/creator/editor-composition/CompositionPreview.jsx`
- Modify: `leyendas-de-bacalar/frontend/src/components/creator/EditorJsPreview.jsx`
- Modify: `leyendas-de-bacalar/frontend/src/utils/editorJsToHtml.test.mjs`
- Modify: `leyendas-de-bacalar/frontend/src/utils/editorJsToHtml.js`

- [ ] **Step 1: Write failing HTML tests**

Test a composition with image, model and marker.

Assert:

- output contains `ejs-composition-preview`;
- image and marker URLs are escaped;
- visible titles are present;
- asset UUIDs are absent;
- model outputs a descriptive placeholder;
- invalid script-like URLs are not emitted as `src`.

- [ ] **Step 2: Run and verify RED**

Expected: composition currently renders empty HTML.

- [ ] **Step 3: Implement static HTML conversion**

Render a relative-positioned static canvas with normalized percentage positions:

```txt
left = x / 900 * 100%
top = y / 560 * 100%
width = width / 900 * 100%
height = height / 560 * 100%
```

Use escaped style values produced only from normalized numbers. Emit:

- `<img>` for image/marker;
- `<div>` placeholder for model;
- no scripts, event handlers or raw JSON.

- [ ] **Step 4: Implement React preview**

`CompositionPreview`:

- uses the same logical scale;
- renders image and marker immediately;
- renders model placeholder with `Ver modelo`;
- mounts lazy `Model3DViewer` only after activation;
- has no selection, drag or resize.

- [ ] **Step 5: Register preview block**

Add:

```jsx
case 'composition':
  return <CompositionPreview data={data} />;
```

- [ ] **Step 6: Update plain text**

For composition, append layer titles/captions only. Do not append IDs or URLs.

- [ ] **Step 7: Run HTML and state tests**

Expected: all tests pass.

---

### Task 8: Styling and responsive behavior

**Files:**

- Modify: `leyendas-de-bacalar/frontend/src/styles/index.css`

- [ ] **Step 1: Add composition surface styles**

Classes:

```txt
.ejs-composition
.ejs-composition__topbar
.ejs-composition__viewport
.ejs-composition__stage
.ejs-composition__layer
.ejs-composition__layer.is-selected
.ejs-composition__resize-handle
.ejs-composition__context
.ejs-composition__layers-panel
.ejs-composition-preview
```

Use:

- white/slate surfaces;
- cyan selection;
- subtle border and shadow;
- no blue administrative cards;
- `touch-action: none` only on active drag/resize regions;
- `user-select: none` during manipulation.

- [ ] **Step 2: Implement contextual toolbar A**

Desktop: floating near selected layer.

Mobile ≤640px: sticky bottom strip inside the composition block with horizontal overflow.

- [ ] **Step 3: Add focus and touch states**

- 44px hit areas;
- `:focus-visible` cyan outline;
- `:active` feedback ≤160ms;
- no `transition: all`;
- no motion under `prefers-reduced-motion`.

- [ ] **Step 4: Prevent Editor.js interference**

The composition stage captures pointer events but does not block page scroll unless a drag/resize is active. Buttons and range inputs stop propagation.

---

### Task 9: Full automated verification

**Files:**

- No production file changes unless a failing test identifies a defect.

- [ ] **Step 1: Run all frontend tests**

```powershell
node --test `
  src/components/creator/editor-composition/compositionState.test.mjs `
  src/components/creator/editor-tools/CompositionBlockTool.test.mjs `
  src/components/creator/editorBlockTools.test.mjs `
  src/components/creator/editor-modals/editorModalUtils.test.mjs `
  src/components/3d/model3dViewerOptions.test.mjs `
  src/services/editorAssetUploadPolicy.test.mjs `
  src/utils/editorJsToHtml.test.mjs
```

Expected: zero failures.

- [ ] **Step 2: Run lint**

```powershell
npm.cmd run lint
```

Expected: zero warnings and errors. If pre-existing unrelated lint failures exist, report exact files and run ESLint on modified files separately.

- [ ] **Step 3: Run frontend build**

```powershell
npm.cmd run build
```

If OneDrive blocks Vite inside sandbox, repeat the exact command outside sandbox. Expected: exit code 0.

- [ ] **Step 4: Confirm backend unchanged**

```powershell
git diff --name-only -- leyendas-de-bacalar/backend
```

Expected: no output.

---

### Task 10: Manual browser verification

**Files:**

- No code changes unless a reproduced defect is first captured with a failing automated test where practical.

- [ ] **Step 1: Start frontend**

```powershell
npm.cmd run dev
```

- [ ] **Step 2: Test editor normal**

1. Open a manual draft.
2. Insert composition.
3. Add image and use as background.
4. Add inline model.
5. Move and resize it.
6. Toggle 3D manipulation and rotate/zoom.
7. Add marker.
8. Change z-index, opacity and lock.
9. Save.
10. Reload.
11. Confirm exact persistence.

- [ ] **Step 3: Test fullscreen**

Repeat insertion, movement, resize, 3D interaction and save. Confirm it uses the same tool and modals.

- [ ] **Step 4: Test responsive**

Verify at:

- 375×812
- 768×1024
- 1024×768
- 1366×768

Confirm:

- logical composition does not reflow;
- visual scale changes;
- toolbar remains usable;
- no horizontal page overflow;
- touch-sized handles remain reachable.

- [ ] **Step 5: Test preview**

Confirm:

- same composition positions;
- image and marker visible;
- model lazy placeholder;
- `Ver modelo` mounts interactive model;
- no raw HTML or UUID labels.

- [ ] **Step 6: Regression smoke**

Open without mutation:

- PDF editor/preview
- CONALITEG reader
- catalog
- legend detail
- creator panel

Check browser console for new errors.

- [ ] **Step 7: Verify DB only if a real authenticated save is available**

Read the saved `legend_pages.editor_data` and confirm:

```txt
type = composition
data.canvas = 900 × 560
layers[].assetId
layers[].x/y/width/height/zIndex/opacity/locked
```

Do not modify schema or RLS.

---

### Task 11: Final review

- [ ] **Step 1: Run diff checks**

```powershell
git diff --check
git status --short
git diff --stat
```

- [ ] **Step 2: Review no-touch boundaries**

Confirm:

- no backend changes;
- no DB/schema/RLS/RPC changes;
- no `.env`;
- no deploy;
- no `node_modules`;
- no PDF/CONALITEG/hotspot code;
- `.claude/settings.local.json` remains untouched as an unrelated user file.

- [ ] **Step 3: Report evidence**

Report:

- created and modified files;
- automated test counts;
- lint and build result;
- exact manual flows observed;
- DB verification status;
- `git status --short`;
- `git diff --stat`;
- remaining limitations, especially rotation UI excluded from this phase.
