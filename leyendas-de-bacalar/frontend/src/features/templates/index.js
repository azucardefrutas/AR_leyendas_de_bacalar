// Public API of the editorial template engine (decoupled from Editor.js).
export { default as TemplatePicker } from './components/TemplatePicker.jsx';
export { default as TemplateSurface } from './components/TemplateSurface.jsx';
export { default as BookTemplatePreview } from './components/BookTemplatePreview.jsx';
export { default as CoverStudio } from './components/CoverStudio.jsx';

export { listTemplates, getTemplateById, getDefaultTemplate } from './templateRegistry.js';
export {
  resolveSurface,
  buildDefaultCoverData,
  buildDefaultBackCoverData,
  FONT_STACKS,
  SURFACE_BASE,
} from './templateEngine.js';
export { useTemplates, useTemplate } from './hooks/useTemplates.js';
export { saveBookTemplate, getBookTemplate } from './services/bookTemplateService.js';
