import { useMemo } from 'react';
import { getTemplateById, listTemplates } from '../templateRegistry.js';

export function useTemplates() {
  return useMemo(() => listTemplates(), []);
}

export function useTemplate(id) {
  return useMemo(() => getTemplateById(id), [id]);
}
