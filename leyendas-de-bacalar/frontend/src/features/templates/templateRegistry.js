// Template registry. Auto-discovers every definition in ./coverTemplates via
// Vite's import.meta.glob — so adding a new template is literally "drop a file
// in coverTemplates/", with zero changes to the editor or the registry.

const modules = import.meta.glob('./coverTemplates/*.js', { eager: true });

// Preferred display order (unknown ids fall to the end, alphabetical).
const ORDER = ['classic', 'modern', 'children', 'historic', 'minimal', 'blank'];

function orderIndex(id) {
  const i = ORDER.indexOf(id);
  return i === -1 ? ORDER.length : i;
}

const TEMPLATES = Object.values(modules)
  .map((mod) => mod.default)
  .filter((tpl) => tpl && tpl.id && tpl.cover)
  .sort((a, b) => orderIndex(a.id) - orderIndex(b.id) || a.name.localeCompare(b.name));

export function listTemplates() {
  return TEMPLATES;
}

export function getTemplateById(id) {
  return TEMPLATES.find((tpl) => tpl.id === id) || null;
}

export function getDefaultTemplate() {
  return getTemplateById('classic') || TEMPLATES[0] || null;
}
