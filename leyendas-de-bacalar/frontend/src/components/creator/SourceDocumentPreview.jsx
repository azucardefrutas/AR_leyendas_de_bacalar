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

function getPagePreview(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Sin texto propuesto.';
  if (normalized.length <= 220) return normalized;
  return `${normalized.slice(0, 220)}...`;
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
  aiProposal,
  aiProposalLoading,
  aiProposalError,
  aiProposalErrorDetails,
  onViewDocument,
  onConvertToInteractive,
  onRequestAiProposal,
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
  const documentType = viewUrl?.documentType || sourceDocument.document_type || asset.asset_type || 'documento';
  const documentTypeLabel = getDocumentTypeLabel({ sourceDocument, viewUrl });
  const statusLabel = getStatusLabel(sourceDocument.extraction_status);
  const extractionStatus = String(sourceDocument.extraction_status || '').toLowerCase();
  const isPdf = isPdfDocument({ sourceDocument, viewUrl });
  const isDocx = isDocxDocument({ sourceDocument, viewUrl });
  const canConvert = !hasInteractivePages && ['pending', 'extracted'].includes(extractionStatus);
  const canRequestAiProposal = extractionStatus === 'extracted';
  const contentId = `source-document-panel-${sourceDocument?.id || 'current'}`;
  const filename = storagePath.split('/').pop() || 'Documento original';
  const proposalProvider = aiProposal?.provider || aiProposalErrorDetails?.provider || (aiProposalLoading ? 'pendiente' : 'gemini');
  const proposalStatus = aiProposalLoading
    ? 'generando'
    : aiProposalError
      ? 'error'
      : aiProposal?.disabled
        ? 'desactivado'
        : aiProposal
          ? 'propuesta generada'
          : 'pendiente';

  useEffect(() => {
    setPreviewExpanded(false);
  }, [sourceDocument?.id]);

  return (
    <section className="creator-section-block source-document-preview">
      <button
        type="button"
        className="creator-accordion-header"
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
          <span className="creator-accordion-badge">{formattedFileSize}</span>
        </span>
        <span className={`creator-accordion-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true">&rsaquo;</span>
      </button>

      <div id={contentId} className={`creator-accordion-panel ${isOpen ? 'open' : 'closed'}`}>
        <div className="creator-review-grid compact">
          <span className="ready">Estado de extraccion: {statusLabel}</span>
          <span>Tipo: {documentType}</span>
          <span>{formattedFileSize}</span>
          <span>MIME: {mimeType}</span>
        </div>

        {storagePath && <p className="creator-muted">Archivo: {storagePath}</p>}
        {viewError && <p className="error-message">{viewError}</p>}
        {processingMessage && <p className="creator-muted">{processingMessage}</p>}

        <div className="creator-review-actions source-document-actions">
          <Button type="button" onClick={onViewDocument} disabled={disabled || viewLoading}>
            {viewLoading ? 'Preparando vista...' : 'Ver documento'}
          </Button>
          {signedUrl && (
            <a className="btn btn-ghost" href={signedUrl} target="_blank" rel="noreferrer">
              Abrir en nueva pestana
            </a>
          )}
          {signedUrl && isPdf && (
            <Button type="button" variant="ghost" onClick={() => setPreviewExpanded(true)}>
              Expandir preview
            </Button>
          )}
          {canConvert && (
            <Button type="button" variant="ghost" onClick={onConvertToInteractive} disabled={disabled || processing}>
              {processing ? (processingMessage || 'Procesando documento...') : 'Convertir a lectura interactiva'}
            </Button>
          )}
          {canRequestAiProposal && (
            <Button type="button" variant="ghost" onClick={onRequestAiProposal} disabled={disabled || aiProposalLoading}>
              {aiProposalLoading ? 'Generando propuesta con IA...' : 'Generar propuesta con IA'}
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onAddManualPage} disabled={disabled || processing}>
            Anadir pagina manualmente
          </Button>
        </div>

        {isOpen && signedUrl && isPdf && (
          <iframe
            className="source-document-preview-frame"
            title="Vista previa del documento original"
            src={signedUrl}
          />
        )}

        {isOpen && signedUrl && isDocx && (
          <p className="creator-muted">
            Vista previa DOCX pendiente. Puedes abrir o descargar el documento con la URL firmada.
          </p>
        )}

        {hasInteractivePages && (
          <p className="creator-muted">Lectura interactiva disponible abajo.</p>
        )}

        {(aiProposal || aiProposalError || aiProposalLoading) && (
          <div className="ai-proposal-panel">
            <div className="ai-proposal-heading">
              <div>
                <h3>Propuesta IA - No aplicada</h3>
                <p>Revisa esta propuesta editorial antes de guardarla. No modifica paginas ni base de datos.</p>
              </div>
              <span className="creator-accordion-badge">
                Provider: {proposalProvider}
              </span>
              <span className="creator-accordion-badge">
                Estado: {proposalStatus}
              </span>
            </div>

            {aiProposalLoading && <p className="creator-muted">Generando propuesta con IA...</p>}
            {aiProposalError && <p className="error-message">{aiProposalError}</p>}

            {aiProposal?.disabled && (
              <p className="creator-muted">La IA esta desactivada en este entorno.</p>
            )}

            {!aiProposal?.disabled && aiProposal?.summary && (
              <div className="ai-proposal-summary">
                <strong>Resumen</strong>
                <p>{aiProposal.summary}</p>
              </div>
            )}

            {!aiProposal?.disabled && aiProposal?.warnings?.length > 0 && (
              <div className="ai-proposal-warnings">
                <strong>Advertencias</strong>
                <ul>
                  {aiProposal.warnings.map((warning, index) => (
                    <li key={`warning-${index}`}>{String(warning)}</li>
                  ))}
                </ul>
              </div>
            )}

            {!aiProposal?.disabled && aiProposal?.pages?.length > 0 && (
              <div className="ai-proposal-pages">
                {aiProposal.pages.map((page, index) => (
                  <article className="ai-proposal-page" key={`${page.page_number || index}-${page.title || 'page'}`}>
                    <div className="ai-proposal-page-header">
                      <span>Pagina {page.page_number || index + 1}</span>
                      <strong>{page.title || 'Sin titulo'}</strong>
                    </div>
                    <p>{getPagePreview(page.text_content)}</p>
                    {Array.isArray(page.notes) && page.notes.length > 0 && (
                      <ul>
                        {page.notes.map((note, noteIndex) => (
                          <li key={`note-${index}-${noteIndex}`}>{String(note)}</li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            )}

            <Button type="button" variant="ghost" disabled>
              Aplicar propuesta estara disponible en la siguiente fase.
            </Button>
          </div>
        )}
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
                  Abrir en nueva pestana
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
