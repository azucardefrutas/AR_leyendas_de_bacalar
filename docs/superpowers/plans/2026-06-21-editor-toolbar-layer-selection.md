# Editor Toolbar and Layer Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the manual story editor with reliable overlapping-media selection, image-like 3D movement, and one centered Canva-inspired typography toolbar shared by normal and fullscreen modes.

**Architecture:** Keep Editor.js as the document engine and extend the existing `MediaObjectView` interaction layer. Add small pure helpers for layer cycling and typography command normalization so behavior can be covered by Node tests. Keep font resources and toolbar presentation in the frontend only.

**Tech Stack:** React 18, Editor.js, Vite, CSS, existing custom Editor.js tools, Node test runner.

---

### Task 1: Layer selection behavior

**Files:**
- Create: `leyendas-de-bacalar/frontend/src/components/creator/editor-media/mediaSelection.js`
- Create: `leyendas-de-bacalar/frontend/src/components/creator/editor-media/mediaSelection.test.mjs`
- Modify: `leyendas-de-bacalar/frontend/src/components/creator/editor-media/MediaObjectView.js`

- [ ] Write tests proving an overlapping stack advances from the current resource to the resource underneath and wraps predictably.
- [ ] Run the focused test and confirm it fails because the helper does not exist.
- [ ] Implement `getNextMediaCandidate(candidates, current)` with duplicate removal and null-safe behavior.
- [ ] Connect `Alt + click` and the contextual action `Seleccionar debajo` to `document.elementsFromPoint`.
- [ ] Ensure selecting one resource deselects the previously active resource.
- [ ] Run all editor-media tests.

### Task 2: 3D move versus manipulate mode

**Files:**
- Modify: `leyendas-de-bacalar/frontend/src/components/creator/editor-media/MediaObjectView.js`
- Modify: `leyendas-de-bacalar/frontend/src/styles/index.css`

- [ ] Make move mode the default and prevent the embedded viewer controls from intercepting the layer drag.
- [ ] Add a visible `Manipular 3D` quick action.
- [ ] In manipulate mode, disable layer drag and enable the model viewer pointer events.
- [ ] Return to move mode with Escape and update the contextual controls immediately.
- [ ] Verify image, marker, and model use the same drag geometry.

### Task 3: Typography command helpers

**Files:**
- Create: `leyendas-de-bacalar/frontend/src/components/creator/editor-toolbar/editorTypography.js`
- Create: `leyendas-de-bacalar/frontend/src/components/creator/editor-toolbar/editorTypography.test.mjs`
- Modify: `leyendas-de-bacalar/frontend/src/components/creator/EditorialRichEditor.jsx`
- Modify: `leyendas-de-bacalar/frontend/src/components/creator/EditorJsPreview.jsx`

- [ ] Write tests for font-size mapping, safe font names, and safe hex colors.
- [ ] Run the focused test and confirm RED.
- [ ] Implement normalization helpers.
- [ ] Extend the editor command handler for `fontName`, `fontSize`, `foreColor`, `hiliteColor`, and alignment.
- [ ] Preserve the resulting inline tags and attributes in preview/render sanitization.
- [ ] Run typography and preview tests.

### Task 4: Shared modern toolbar

**Files:**
- Modify: `leyendas-de-bacalar/frontend/src/components/creator/EditorJsToolbar.jsx`
- Modify: `leyendas-de-bacalar/frontend/src/styles/index.css`

- [ ] Add a compact font selector with Inter, Nunito Sans, Lora, and Playfair Display.
- [ ] Add font-size decrement/input/increment controls with bounded values.
- [ ] Add text-color and highlight-color controls.
- [ ] Keep headings, bold, italic, underline, strike, alignment, lists, links, table, image, model, and marker functional.
- [ ] Split text formatting from resource insertion visually without duplicating handlers.
- [ ] Keep all controls keyboard-labelled and at least 38px high.

### Task 5: Restore insertion rail and center editor

**Files:**
- Restore: `leyendas-de-bacalar/frontend/src/components/creator/EditorInsertRail.jsx`
- Modify: `leyendas-de-bacalar/frontend/src/styles/index.css`

- [ ] Restore the currently empty tracked component because it is imported by the active editor.
- [ ] Keep the rail minimal and functional.
- [ ] Center the editor workspace, page sheet, and toolbar at desktop widths.
- [ ] Use the same structure in normal and fullscreen modes.
- [ ] Verify tablet/mobile wrapping without horizontal overflow.

### Task 6: Verification

**Files:**
- No production files.

- [ ] Run `node --test src/components/creator/editor-media/*.test.mjs src/components/creator/editor-toolbar/*.test.mjs src/components/creator/editorBlockTools.test.mjs src/utils/editorJsToHtml.test.mjs`.
- [ ] Run `npm.cmd run build`, retrying outside the sandbox only for the known OneDrive/Vite permission error.
- [ ] Reload the local creator editor and verify toolbar centering and layer selection.
- [ ] Run `git diff --check`, `git status --short`, and `git diff --stat`.
- [ ] Do not commit.
