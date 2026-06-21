# Editor Page Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir cada página existente del editor manual en una hoja-lienzo extensible donde imágenes, modelos 3D y marcadores puedan moverse, redimensionarse, rotarse, superponerse y persistir sin una caja de composición separada.

**Architecture:** Editor.js conserva el texto y cada recurso mantiene un bloque-ancla persistente. La redactor surface de la página es el sistema de coordenadas lógico de 1120 unidades; los recursos `free` se posicionan sobre la hoja completa. Un overlay compartido proporciona ocho handles, rotación, barra rápida y menú contextual, mientras la barra vertical usa los modales y servicios de assets existentes.

**Tech Stack:** React 18, Editor.js, Pointer Events, Three.js/React Three Fiber existentes, CSS, Node test runner.

**Constraints:** Sin commit, dependencias nuevas, backend, DB, RLS, `.env`, Storage, PDF, CONALITEG, hotspots o deploy.

---

## File map

**Create**

- `frontend/src/components/creator/editor-media/mediaGeometry.js`
- `frontend/src/components/creator/editor-media/mediaGeometry.test.mjs`
- `frontend/src/components/creator/editor-media/mediaClipboard.js`
- `frontend/src/components/creator/editor-media/mediaClipboard.test.mjs`
- `frontend/src/components/creator/editor-media/EditorInsertRail.jsx`

**Modify**

- `frontend/src/components/creator/editor-media/MediaObjectView.js`
- `frontend/src/components/creator/editor-media/mediaLayoutState.js`
- `frontend/src/components/creator/editor-media/mediaLayoutState.test.mjs`
- `frontend/src/components/creator/editor-media/mediaDomLayout.js`
- `frontend/src/components/creator/editor-media/mediaDomLayout.test.mjs`
- `frontend/src/components/creator/editorBlockTools.js`
- `frontend/src/components/creator/EditorialRichEditor.jsx`
- `frontend/src/components/creator/EditorJsToolbar.jsx`
- `frontend/src/components/creator/EditorJsPreview.jsx`
- `frontend/src/utils/editorJsToHtml.js`
- `frontend/src/utils/editorJsToHtml.test.mjs`
- `frontend/src/styles/index.css`

---

### Task 1: Page-canvas geometry

- [ ] Add failing tests for eight resize directions, rotation, logical/rendered coordinate conversion, page clamp and minimum page height.
- [ ] Run `node --test src/components/creator/editor-media/mediaGeometry.test.mjs` and verify RED.
- [ ] Implement immutable helpers:

```js
resizeFromHandle(layout, handle, delta, metrics)
rotateFromPointer(layout, center, pointer)
logicalPointFromClient(point, sheetRect)
clampFreeLayoutToSheet(layout, sheet)
getRequiredPageHeight(blockBottom, mediaLayouts, padding)
```

- [ ] Verify GREEN.

### Task 2: Persisted rotation and free defaults

- [ ] Extend failing layout tests so new image/model/marker insertion defaults to `mode: free`, preserves `rotation`, and clamps within dynamic page height.
- [ ] Update `mediaLayoutState.js` minimally.
- [ ] Verify existing legacy inline/wrap JSON remains readable.

### Task 3: Internal copy/paste

- [ ] Add failing tests for copy, paste with offset, duplicate, new anchor ID and shared asset reference.
- [ ] Implement module-scoped clipboard without browser clipboard or Storage duplication.
- [ ] Verify locked state is cleared in copies and geometry is clamped.

### Task 4: Selection overlay

- [ ] Refactor `MediaObjectView` to render eight directional handles and a rotation handle.
- [ ] Use transform-based live feedback and persist only normalized values.
- [ ] Add keyboard movement, Delete and Shift+F10.
- [ ] Ensure model move/interact modes do not conflict.

### Task 5: Quick toolbar and context menu

- [ ] Split compact toolbar behavior from full context menu behavior.
- [ ] Selection shows only duplicate, front/back, lock, delete and more.
- [ ] Right click/More shows copy, paste, duplicate, delete, alignment, layer order, lock, link, alt text, crop or 3D mode.
- [ ] Hide every unsupported action.

### Task 6: Vertical insertion rail

- [ ] Create `EditorInsertRail.jsx` with 44px controls for Add, Text, Image, Model 3D, Marker, Table and Delimiter.
- [ ] Reuse `onInsertBlock` and `onOpenModal`.
- [ ] Add a searchable compact add panel.
- [ ] Collapse rail responsively and hide it in preview.

### Task 7: Page integration

- [ ] Make `.editorial-editor__canvas`/surface the single page coordinate context.
- [ ] Pass sheet metrics to media tools.
- [ ] Insert new resources as selected free objects within the visible sheet.
- [ ] Recalculate minimum page height from text and media bottoms.
- [ ] Preserve `Pág. X / + Página`, save-before-switch and independent page JSON.

### Task 8: Editor.js plus and text toolbar

- [ ] Fix `.ce-toolbar`, `.ce-toolbar__plus`, `.ce-toolbar__settings-btn` offsets against the real content margin.
- [ ] Ensure the plus never centers over text or media.
- [ ] Keep the horizontal toolbar for text only and reduce its fullscreen footprint.

### Task 9: Fullscreen shell

- [ ] Reduce header to 56–64px full width with title 18–20px, subtitle 12px, modes, stats and close.
- [ ] Place page navigator and insertion rail outside the white sheet.
- [ ] Use a clean extensible white page with subtle shadow, no inner canvas border.
- [ ] Keep footer actions usable without covering content.

### Task 10: Preview and HTML

- [ ] Add failing HTML tests for free position, rotation, z-index, crop and dynamic page height.
- [ ] Render preview with the same geometry and no controls.
- [ ] Sanitize all style values from normalized numeric/enumerated data.

### Task 11: Automated validation

- [ ] Run all editor media, block tool, modal, asset policy and HTML tests.
- [ ] Run `npm.cmd run lint`; report the known missing ESLint config without changing scope.
- [ ] Run `npm.cmd run build`, retrying outside sandbox for the known OneDrive restriction.
- [ ] Run `git diff --check`, `git status --short`, `git diff --stat`.

### Task 12: Manual validation

- [ ] Verify image, model and marker drag/resize/rotation/layers/context menu.
- [ ] Verify model move/interact.
- [ ] Save, reload and confirm persistence.
- [ ] Add a page and confirm independent clean canvas.
- [ ] Verify fullscreen desktop/tablet/mobile, plus positioning and preview.
- [ ] Smoke-check protected PDF/CONALITEG/catalog/detail routes where session access permits.
