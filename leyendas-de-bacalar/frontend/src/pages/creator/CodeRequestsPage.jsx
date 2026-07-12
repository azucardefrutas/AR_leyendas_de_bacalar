import React, { useEffect, useMemo, useState } from 'react';

import AppIcon from '../../components/ui/AppIcon.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import StatusBadge from '../../shared/status/StatusBadge.jsx';
import {
  downloadCreatorCodeBatchCsv,
  generateCreatorCodes,
  getCreatorCodesOverview,
} from '../../services/backendApiService.js';

const EMPTY_OVERVIEW = {
  legends: [],
  summary: { generated: 0, generatedThisMonth: 0, redeemed: 0 },
  history: [],
};

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function CodeRequestsPage() {
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [form, setForm] = useState({ legendId: '', quantity: 25, prefix: '', reason: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exportingBatchId, setExportingBatchId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadOverview({ preserveLegend = true } = {}) {
    const result = await getCreatorCodesOverview();
    const nextOverview = {
      legends: result?.legends ?? [],
      summary: result?.summary ?? EMPTY_OVERVIEW.summary,
      history: result?.history ?? [],
    };
    setOverview(nextOverview);
    setForm((current) => ({
      ...current,
      legendId: preserveLegend && nextOverview.legends.some((legend) => legend.id === current.legendId)
        ? current.legendId
        : nextOverview.legends[0]?.id || '',
    }));
  }

  useEffect(() => {
    let mounted = true;
    getCreatorCodesOverview()
      .then((result) => {
        if (!mounted) return;
        const nextOverview = {
          legends: result?.legends ?? [],
          summary: result?.summary ?? EMPTY_OVERVIEW.summary,
          history: result?.history ?? [],
        };
        setOverview(nextOverview);
        setForm((current) => ({ ...current, legendId: nextOverview.legends[0]?.id || '' }));
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'No pudimos cargar la gestion de codigos.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const selectedLegend = useMemo(
    () => overview.legends.find((legend) => legend.id === form.legendId) || null,
    [overview.legends, form.legendId],
  );
  const quantity = Number(form.quantity) || 0;

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const response = await generateCreatorCodes({
        legendId: form.legendId,
        quantity,
        prefix: form.prefix,
        reason: form.reason,
      });
      const result = response?.result;
      await loadOverview();
      setForm((current) => ({ ...current, quantity: 25, prefix: '', reason: '' }));
      setMessage(result?.message || (result?.outcome === 'generated'
        ? 'Codigos generados. Ya puedes exportar el lote.'
        : 'Solicitud enviada para revision.'));
    } catch (submitError) {
      setError(submitError.message || 'No se pudieron generar los codigos.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExport(item) {
    const batch = item.batches?.find((candidate) => candidate.exportable);
    if (!batch) return;
    setExportingBatchId(batch.id);
    setError('');
    try {
      await downloadCreatorCodeBatchCsv(batch.id, `codigos-${item.legendTitle || 'leyenda'}.csv`);
    } catch (exportError) {
      setError(exportError.message || 'No se pudo exportar el lote.');
    } finally {
      setExportingBatchId('');
    }
  }

  if (loading) return <LoadingState message="Cargando gestion de codigos..." />;

  return (
    <section className="page-stack creator-panel creator-code-console">
      <header className="creator-code-heading">
        <div>
          <p className="eyebrow">Ediciones fisicas</p>
          <h1>Generar codigos</h1>
          <p>Genera accesos unicos para incluir en tus libros impresos y desbloquear su version digital.</p>
        </div>
      </header>

      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}

      <div className="creator-code-main-grid">
        <Card className="creator-code-generation-card">
          <div className="creator-code-card-title">
            <span className="creator-code-title-icon"><AppIcon name="key" size={20} /></span>
            <div>
              <h2>Nueva generacion de codigos</h2>
              <p>Los lectores usaran cada codigo una sola vez para activar la leyenda digital.</p>
            </div>
          </div>

          <form className="creator-code-form" onSubmit={handleSubmit}>
            <label className="field" htmlFor="code-legend">
              <span>Obra o leyenda a vincular</span>
              <select
                id="code-legend"
                className="select"
                value={form.legendId}
                onChange={(event) => updateField('legendId', event.target.value)}
                required
              >
                {overview.legends.length === 0 && <option value="">Sin leyendas disponibles</option>}
                {overview.legends.map((legend) => (
                  <option key={legend.id} value={legend.id}>{legend.title}</option>
                ))}
              </select>
              {selectedLegend && (
                <small>
                  {selectedLegend.editionName} · {selectedLegend.generated} generados · {selectedLegend.redeemed} canjeados
                </small>
              )}
            </label>

            <div className="creator-code-quantity-row">
              <label className="field" htmlFor="code-quantity">
                <span>Cantidad de codigos</span>
                <input
                  id="code-quantity"
                  className="input standalone-input"
                  type="number"
                  min="1"
                  max="500"
                  value={form.quantity}
                  onChange={(event) => updateField('quantity', event.target.value)}
                  required
                />
              </label>
              <span className="creator-code-approval is-automatic">
                <AppIcon name="check_circle" size={18} />
                Generacion inmediata
              </span>
            </div>

            <details className="creator-code-advanced">
              <summary>Opciones avanzadas</summary>
              <div className="creator-code-advanced-fields">
                <label className="field" htmlFor="code-prefix">
                  <span>Prefijo personalizado</span>
                  <input
                    id="code-prefix"
                    className="input standalone-input"
                    value={form.prefix}
                    onChange={(event) => updateField('prefix', event.target.value)}
                    placeholder="Ej. BAC"
                    minLength={2}
                    maxLength={10}
                    pattern="[A-Za-z0-9]*"
                  />
                  <small>Entre 2 y 10 letras o numeros. Si queda vacio se usara BAC.</small>
                </label>
                <label className="field" htmlFor="code-reason">
                  <span>Motivo o edicion (opcional)</span>
                  <textarea
                    id="code-reason"
                    className="textarea"
                    rows={3}
                    maxLength={500}
                    value={form.reason}
                    onChange={(event) => updateField('reason', event.target.value)}
                    placeholder="Ej. Primera edicion para presentacion escolar."
                  />
                </label>
              </div>
            </details>

            <div className="creator-code-submit-row">
              <Button type="submit" disabled={submitting || !form.legendId || quantity < 1}>
                {submitting ? 'Generando...' : 'Generar codigos'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="creator-code-summary-card">
          <div className="creator-code-summary-title">
            <div>
              <span>Codigos generados</span>
              <strong>{overview.summary.generated}</strong>
              <small>en total</small>
            </div>
            <AppIcon name="info" size={20} />
          </div>
          <dl className="creator-code-metrics">
            <div>
              <dt>Generados este mes</dt>
              <dd>{overview.summary.generatedThisMonth}</dd>
            </div>
            <div>
              <dt>Lectores que han canjeado</dt>
              <dd>{overview.summary.redeemed}</dd>
            </div>
          </dl>
          <p>Los codigos se generan al instante. El administrador recibe una copia y puede generar mas si se amerita.</p>
        </Card>
      </div>

      <Card className="creator-code-history-card">
        <div className="creator-code-history-heading">
          <div>
            <p className="eyebrow">Control de lotes</p>
            <h2>Historial reciente</h2>
          </div>
          <span>{overview.history.length} registros</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table creator-code-history-table">
            <thead>
              <tr>
                <th>Obra</th>
                <th>Cantidad</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {overview.history.length === 0 ? (
                <tr><td colSpan={5}>Aun no has generado codigos.</td></tr>
              ) : overview.history.map((item) => {
                const batch = item.batches?.find((candidate) => candidate.exportable);
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.legendTitle}</strong>
                      {item.adminFeedback && <small>{item.adminFeedback}</small>}
                    </td>
                    <td>{item.generatedCount || item.quantity}</td>
                    <td><StatusBadge status={item.status || 'pending'} context="code" size="small" /></td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>
                      {batch ? (
                        <button
                          type="button"
                          className="creator-code-export-button"
                          onClick={() => handleExport(item)}
                          disabled={exportingBatchId === batch.id}
                        >
                          <AppIcon name="download" size={17} />
                          {exportingBatchId === batch.id ? 'Exportando' : 'CSV'}
                        </button>
                      ) : <span className="creator-code-no-action">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}

export default CodeRequestsPage;
