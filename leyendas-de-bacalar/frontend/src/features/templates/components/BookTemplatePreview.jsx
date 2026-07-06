import React from 'react';
import TemplateSurface from './TemplateSurface.jsx';
import { getTemplateById } from '../templateRegistry.js';

// Shows the resolved cover + back cover for a template (the "book" wrapper).
// Editor.js pages are rendered elsewhere — this only draws the two surfaces.
export default function BookTemplatePreview({ templateId, coverData, backCoverData, meta = {} }) {
  const template = getTemplateById(templateId);
  if (!template) return null;

  const cover = coverData || { content: { title: meta.title, subtitle: meta.subtitle, author: meta.author } };
  const back = backCoverData || { content: { sinopsis: meta.sinopsis, author: meta.author, bio: meta.bio } };

  return (
    <div className="tpl-preview-pair">
      <figure>
        <figcaption>Portada</figcaption>
        <div className="tpl-preview-frame"><TemplateSurface surface={template.cover} data={cover} /></div>
      </figure>
      <figure>
        <figcaption>Contraportada</figcaption>
        <div className="tpl-preview-frame"><TemplateSurface surface={template.backCover} data={back} /></div>
      </figure>
    </div>
  );
}
