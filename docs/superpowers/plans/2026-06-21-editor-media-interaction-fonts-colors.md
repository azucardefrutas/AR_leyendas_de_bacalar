# Editor Media Interaction, Fonts and Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make free 3D media draggable from its full surface, allow repeated-click selection through overlapping layers, add functional color palettes, and move the expanded free-font catalog into independent files.

**Architecture:** Keep `MediaObjectView` as the DOM interaction owner but move gesture decisions into pure tested helpers. Keep typography validation in `editorTypography.js`, source font metadata from a dedicated catalog, and render reusable controlled color popovers in the existing React toolbar. Load the selected free families from a dedicated stylesheet imported by the global stylesheet.

**Tech Stack:** React 18, Editor.js, Pointer Events, native DOM APIs, CSS, Node test runner.

---

### Task 1: Pointer gesture and overlapping-layer selection

**Files:**
- Create: `leyendas-de-bacalar/frontend/src/components/creator/editor-media/mediaPointerGesture.js`
- Create: `leyendas-de-bacalar/frontend/src/components/creator/editor-media/mediaPointerGesture.test.mjs`
- Modify: `leyendas-de-bacalar/frontend/src/components/creator/editor-media/mediaSelection.js`
- Modify: `leyendas-de-bacalar/frontend/src/components/creator/editor-media/mediaSelection.test.mjs`

- [ ] **Step 1: Write failing tests**

Add tests asserting:

```js
assert.equal(hasExceededDragThreshold({ x: 10, y: 10 }, { x: 13, y: 12 }), false);
assert.equal(hasExceededDragThreshold({ x: 10, y: 10 }, { x: 16, y: 10 }), true);
assert.equal(shouldCycleMediaSelection({
  isCurrentSelected: true,
  moved: false,
  previousPoint: { x: 100, y: 100 },
  point: { x: 102, y: 103 },
}), true);
assert.equal(shouldCycleMediaSelection({
  isCurrentSelected: true,
  moved: true,
  previousPoint: { x: 100, y: 100 },
  point: { x: 102, y: 103 },
}), false);
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
node --test frontend/src/components/creator/editor-media/mediaPointerGesture.test.mjs frontend/src/components/creator/editor-media/mediaSelection.test.mjs
```

Expected: failure because the new helper exports do not exist.

- [ ] **Step 3: Implement minimal pure helpers**

Implement:

```js
export function hasExceededDragThreshold(start, current, threshold = 4) {
  return Math.hypot(current.x - start.x, current.y - start.y) >= threshold;
}

export function areSelectionPointsNear(a, b, tolerance = 8) {
  if (!a || !b) return false;
  return Math.hypot(a.x - b.x, a.y - b.y) <= tolerance;
}

export function shouldCycleMediaSelection({
  isCurrentSelected,
  moved,
  previousPoint,
  point,
}) {
  return Boolean(isCurrentSelected && !moved && areSelectionPointsNear(previousPoint, point));
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run the same command. Expected: all gesture and selection tests pass.

### Task 2: Full-surface drag for models and click-through cycling

**Files:**
- Modify: `leyendas-de-bacalar/frontend/src/components/creator/editor-media/MediaObjectView.js`
- Modify: `leyendas-de-bacalar/frontend/src/styles/index.css`

- [ ] **Step 1: Integrate the tested gesture helpers**

Update `attachDrag()` so pointer-down captures:

```js
const wasSelected = activeMediaView === this;
const point = { x: event.clientX, y: event.clientY };
let moved = false;
```

On pointer move, set `moved` only after `hasExceededDragThreshold()` returns true. Before that threshold, do not update layout.

- [ ] **Step 2: Make the full model frame the move surface**

In move mode:

```js
this.frame.setPointerCapture?.(event.pointerId);
```

Keep all model viewer descendants `pointer-events: none` unless `interacting3d` is true. Do not exclude canvas descendants from drag.

- [ ] **Step 3: Cycle overlapping selection on click without movement**

On pointer up:

```js
if (shouldCycleMediaSelection({
  isCurrentSelected: wasSelected,
  moved,
  previousPoint: this.lastSelectionPoint,
  point,
})) {
  this.selectBelow(point.x, point.y);
}
this.lastSelectionPoint = point;
```

Alt-click continues to call `selectBelow()` directly. A completed drag must never cycle selection.

- [ ] **Step 4: Keep 3D manipulation explicit**

Default `interacting3d` to false. Label the contextual control `Manipular 3D` in move mode and `Mover capa` only while OrbitControls is active. Escape returns to move mode.

- [ ] **Step 5: Run focused tests**

Run:

```powershell
node --test frontend/src/components/creator/editor-media/*.test.mjs
```

Expected: all media tests pass.

### Task 3: Independent free-font catalog

**Files:**
- Create: `leyendas-de-bacalar/frontend/src/components/creator/editorFonts.js`
- Create: `leyendas-de-bacalar/frontend/src/styles/editor-fonts.css`
- Modify: `leyendas-de-bacalar/frontend/src/components/creator/editorTypography.js`
- Modify: `leyendas-de-bacalar/frontend/src/components/creator/editorTypography.test.mjs`
- Modify: `leyendas-de-bacalar/frontend/src/styles/index.css`

- [ ] **Step 1: Expand the failing typography test**

Assert the exact safe catalog:

```js
[
  'Inter', 'Nunito Sans', 'Work Sans', 'Montserrat', 'Poppins', 'Raleway',
  'Lora', 'Playfair Display', 'Merriweather', 'Libre Baskerville',
  'Crimson Pro', 'Cormorant Garamond', 'Newsreader',
]
```

Also assert each entry has `label`, `value`, `stack`, and `category`.

- [ ] **Step 2: Run test and verify RED**

Run:

```powershell
node --test frontend/src/components/creator/editorTypography.test.mjs
```

Expected: failure because the existing catalog has only four entries.

- [ ] **Step 3: Create catalog and dedicated stylesheet**

Export `EDITOR_FONT_OPTIONS` from `editorFonts.js`. Import and re-export it as `FONT_OPTIONS` from `editorTypography.js`.

Move the editor-family Google Fonts request from `index.css` into `editor-fonts.css`; retain the existing Material Symbols import unchanged because it is outside this task.

- [ ] **Step 4: Add preview font mappings**

Add matching `font[face='...']` rules for every catalog family using the exact fallback stack.

- [ ] **Step 5: Run typography tests and verify GREEN**

Expected: all typography tests pass and arbitrary font names still fall back safely.

### Task 4: Functional Canva-style color palettes

**Files:**
- Create: `leyendas-de-bacalar/frontend/src/components/creator/editorColorPalette.js`
- Create: `leyendas-de-bacalar/frontend/src/components/creator/editorColorPalette.test.mjs`
- Modify: `leyendas-de-bacalar/frontend/src/components/creator/EditorJsToolbar.jsx`
- Modify: `leyendas-de-bacalar/frontend/src/styles/index.css`

- [ ] **Step 1: Write failing palette tests**

Assert:

```js
assert.equal(TEXT_COLOR_OPTIONS.includes('#0f172a'), true);
assert.equal(HIGHLIGHT_COLOR_OPTIONS.includes('#fef08a'), true);
assert.equal(resolveEditorColor('#0891b2', '#0f172a'), '#0891b2');
assert.equal(resolveEditorColor('javascript:alert(1)', '#0f172a'), '#0f172a');
```

- [ ] **Step 2: Run test and verify RED**

Run:

```powershell
node --test frontend/src/components/creator/editorColorPalette.test.mjs
```

Expected: failure because the palette module does not exist.

- [ ] **Step 3: Implement palette data and validation**

Use restrained accessible swatches for slate, cyan, blue, violet, rose, amber and green. Reuse `normalizeHexColor()` for custom values.

- [ ] **Step 4: Implement reusable `ColorPopover`**

The component:

- stores the active value;
- opens from the text/highlight icon;
- applies a swatch through `onInline`;
- exposes a native custom color input;
- closes on Escape and outside click;
- preserves selection with `onMouseDown={event => event.preventDefault()}`;
- displays the current value as the icon underline.

- [ ] **Step 5: Add compact minimal styles**

Use white surface, slate border, 10–12px radius, subtle shadow, 28px swatches, clear focus ring, no gradient.

- [ ] **Step 6: Run palette and typography tests**

Expected: all pass.

### Task 5: Regression verification

**Files:**
- Verify only; do not modify backend, `.env`, DB, deploy, or `node_modules`.

- [ ] **Step 1: Run all frontend Node tests**

Run:

```powershell
Get-ChildItem frontend/src -Recurse -Filter *.test.mjs | ForEach-Object { $_.FullName } | node --test
```

Expected: all tests pass.

- [ ] **Step 2: Run frontend lint**

Run:

```powershell
cd frontend
npm.cmd run lint
```

Expected: zero warnings and zero errors.

- [ ] **Step 3: Run production build**

Run:

```powershell
cd frontend
npm.cmd run build
```

Expected: successful Vite production build. If OneDrive sandbox permissions block it, rerun outside the sandbox.

- [ ] **Step 4: Verify manually in normal editor and fullscreen**

Confirm:

- model drags from center and transparent areas;
- second stationary click selects the image below;
- dragging does not cycle layers;
- `Manipular 3D` rotates/zooms and Escape restores move mode;
- font catalog renders all families;
- text and highlight palettes apply real formatting.

- [ ] **Step 5: Report repository state**

Run:

```powershell
git status --short
git diff --stat
```

Report unrelated pre-existing files separately. Do not commit.
