-- Migration: allow_rendered_page_images_in_legend_documents_bucket
-- Fase 8 backend render/cache.
--
-- Keep rendered PDF pages in the private legend-documents bucket so drafts
-- and private documents are not exposed through the public legend-assets bucket.

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/webp',
  'image/png'
]
where id = 'legend-documents';
