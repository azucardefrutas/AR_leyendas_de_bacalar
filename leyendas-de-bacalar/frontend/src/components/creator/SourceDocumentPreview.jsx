import React, { useEffect, useState } from 'react';
import Button from '../ui/Button.jsx';

function getSourceDocumentAsset(sourceDocument = {}) {
  return sourceDocument.assets || sourceDocument.asset || {};
}

function formatFileSize(size) {
  const bytes = Number(size || 0);
  if (!bytes) return 'Tamano no disponible';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPageCount(pageCount) {
  const pages = Number(pageCount);
  if (!Number.isInteger(pages) || pages <= 0) return '';
  return pages === 1 ? '1 pagina' : `${pages} paginas`;
}

function getStatusLabel(status) {
  const labels = {
    pending: 'pendiente de extraccion',
    extracted: 'extraido',
    failed: 'fallo de extraccion',
    manual_required: 'revision manual requerida',
    not_required: 'no requiere extraccion',
  };

  const normalized = String(status || '').toLowerCase();
  return labels[normalized] || normalized || 'estado no disponible';
}

function getDocumentTypeLabel({ sourceDocument, viewUrl }) {
  const asset = getSourceDocumentAsset(sourceDocument);
  return String(viewUrl?.documentType || sourceDocument.document_type || asset.asset_type || 'documento').toUpperCase();
}

function isPdfDocument({ sourceDocument, viewUrl }) {
  const asset = getSourceDocumentAsset(sourceDocument);
  const documentType = String(viewUrl?.documentType || sourceDocument.document_type || asset.asset_type || '').toLowerCase();
  const mimeType = String(viewUrl?.mimeType || asset.mime_type || '').toLowerCase();

  return documentType === 'pdf' || mimeType === 'application/pdf';
}

function isDocxDocument({ sourceDocument, viewUrl }) {
  const asset = getSourceDocumentAsset(sourceDocument);
  const documentType = String(viewUrl?.documentType || sourceDocument.document_type || asset.asset_type || '').toLowerCase();
  const mimeType = String(viewUrl?.mimeType || asset.mime_type || '').toLowerCase();

  return documentType === 'docx' || mimeType.includes('wordprocessingml') || mimeType === 'application/msword';
}

function SourceDocumentPreview({
  sourceDocument,
  viewUrl,
  viewLoading,
  viewError,
  disabled,
  hasInteractivePages,
  processing,
  processingMessage,
  onViewDocument,
  onConvertToInteractive,
  onAddManualPage,
  isOpen,
  onToggle,
}) {
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const asset = getSourceDocumentAsset(sourceDocument);
  const signedUrl = viewUrl?.signedUrl || '';
  const storagePath = viewUrl?.storagePath || asset.storage_path || '';
  const mimeType = viewUrl?.mimeType || asset.mime_type || 'MIME no disponible';
  const fileSize = viewUrl?.fileSize || asset.file_size || sourceDocument.file_size;
  const formattedFileSize = formatFileSize(fileSize);
  const pageCount = viewUrl?.pageCount ?? sourceDocument.page_count ?? sourceDocument.pageCount;
  const pageCountLabel = formatPageCount(pageCount);
  const documentType = viewUrl?.documentType || sourceDocument.document_type || asset.asset_type || 'documento';
  const documentTypeLabel = getDocumentTypeLabel({ sourceDocument, viewUrl });
  const statusLabel = getStatusLabel(sourceDocument.extraction_status);
  const extractionStatus = String(sourceDocument.extraction_status || '').toLowerCase();
  const isPdf = isPdfDocument({ sourceDocument, viewUrl });
  const isDocx = isDocxDocument({ sourceDocument, viewUrl });
  const canConvert = !hasInteractivePages && ['pending', 'extracted'].includes(extractionStatus);
  const contentId = `source-document-panel-${sourceDocument?.id || 'current'}`;
  const filename = storagePath.split('/').pop() || 'Documento original';

  useEffect(() => {
    setPreviewExpanded(false);
  }, [sourceDocument?.id]);

  return (
    <section className="creator-section-block source-document-preview">
      <button
        type="button"
        className="creator-accordion-header source-document-header"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <span className="creator-accordion-icon">DOC</span>
        <div className="creator-accordion-copy">
          <h2>Documento original</h2>
          <p>El archivo cargado se conserva como fuente principal de esta obra.</p>
        </div>
        <span className="creator-accordion-badges">
          <span className="creator-accordion-badge">{documentTypeLabel}</span>
          <span className="creator-accordion-badge">{statusLabel}</span>
          {pageCountLabel && <span className="creator-accordion-badge">{pageCountLabel}</span>}
          <span className="creator-accordion-badge">{formattedFileSize}</span>
        </span>
        <span className={`creator-accordion-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true">&rsaquo;</span>
      </button>

      <div id={contentId} className={`creator-accordion-panel source-document-panel ${isOpen ? 'open' : 'closed'}`}>
        {viewError && <p className="error-message">{viewError}</p>}
        {processingMessage && <p className="creator-muted">{processingMessage}</p>}

        <div className="source-document-primary-actions">
          <Button type="button" onClick={onViewDocument} disabled={disabled || viewLoading}>
            {viewLoading ? 'Preparando preview...' : 'Ver preview'}
          </Button>
          {signedUrl ? (
            <a className="btn btn-ghost" href={signedUrl} target="_blank" rel="noreferrer">
              Abrir completo
            </a>
          ) : (
            <Button type="button" variant="ghost" disabled>
              Abrir completo
            </Button>
          )}
        </div>

        {isOpen && signedUrl && isPdf && (
          <div className="source-document-viewer">
            <div className="source-document-viewer-toolbar">
              <span>Preview PDF</span>
              <div>
                <Button type="button" variant="ghost" onClick={() => setPreviewExpanded(true)}>
                  Pantalla completa
                </Button>
                <a className="btn btn-ghost" href={signedUrl} target="_blank" rel="noreferrer">
                  Abrir completo
                </a>
              </div>
            </div>
            <iframe
              className="source-document-preview-frame"
              title="Vista previa del documento original"
              src={signedUrl}
            />
          </div>
        )}

        {isOpen && signedUrl && isDocx && (
          <p className="creator-muted">
            Vista previa DOCX pendiente. Puedes abrir o descargar el documento con la URL firmada.
          </p>
        )}

        {hasInteractivePages && (
          <p className="creator-muted">Lectura interactiva disponible abajo.</p>
        )}

        <p className="creator-muted source-document-future-note">
          Los marcadores y modelos 3D podran vincularse por pagina en una fase posterior.
        </p>

        <details className="source-document-advanced">
          <summary>Opciones avanzadas</summary>
          <div className="source-document-advanced-body">
            {canConvert && (
              <Button type="button" variant="ghost" onClick={onConvertToInteractive} disabled={disabled || processing}>
                {processing ? (processingMessage || 'Procesando documento...') : 'Convertir a lectura interactiva'}
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onAddManualPage} disabled={disabled || processing}>
              Anadir pagina manualmente
            </Button>
            <details className="source-document-technical">
              <summary>Detalles tecnicos</summary>
              <dl>
                <div>
                  <dt>Estado</dt>
                  <dd>{statusLabel}</dd>
                </div>
                <div>
                  <dt>Tipo</dt>
                  <dd>{documentType}</dd>
                </div>
                <div>
                  <dt>Tamano</dt>
                  <dd>{formattedFileSize}</dd>
                </div>
                <div>
                  <dt>Paginas detectadas</dt>
                  <dd>{pageCountLabel || 'No disponible'}</dd>
                </div>
                <div>
                  <dt>MIME</dt>
                  <dd>{mimeType}</dd>
                </div>
                <div>
                  <dt>Source document ID</dt>
                  <dd>{sourceDocument.id || 'No disponible'}</dd>
                </div>
                <div>
                  <dt>Asset ID</dt>
                  <dd>{asset.id || sourceDocument.asset_id || 'No disponible'}</dd>
                </div>
                {storagePath && (
                  <div>
                    <dt>Ruta Storage</dt>
                    <dd>{storagePath}</dd>
                  </div>
                )}
              </dl>
            </details>
          </div>
        </details>
      </div>

      {previewExpanded && signedUrl && isPdf && (
        <div className="source-document-modal" role="dialog" aria-modal="true" aria-label="Preview del documento original">
          <div className="source-document-modal-panel">
            <div className="source-document-modal-header">
              <div>
                <h3>{filename}</h3>
                <p>{documentTypeLabel} &middot; {statusLabel}</p>
              </div>
              <div className="source-document-modal-actions">
                <a className="btn btn-ghost" href={signedUrl} target="_blank" rel="noreferrer">
                  Abrir completo
                </a>
                <Button type="button" variant="ghost" onClick={() => setPreviewExpanded(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
            <iframe
              className="source-document-modal-frame"
              title="Preview ampliado del documento original"
              src={signedUrl}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export default SourceDocumentPreview;
