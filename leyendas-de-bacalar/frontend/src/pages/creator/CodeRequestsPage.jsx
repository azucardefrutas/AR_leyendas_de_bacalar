import React, { useEffect, useMemo, useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import StatusBadge from '../../shared/status/StatusBadge.jsx';
import {
  getMyCodeRequests,
  getMyLegends,
  selfGenerateCodes,
} from '../../services/creatorService.js';

function getRequestQuantity(request) {
  return request.quantity_requested ?? request.quantity ?? 0;
}

function getVisibleCodes(requests = []) {
  return requests.flatMap((request) =>
    (request.accessCodes || [])
      .filter((code) => code.display_code)
      .map((code) => ({
        ...code,
        request,
      }))
  );
}

function escapeCsv(value = '') {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function downloadCsv(filename, rows = []) {
  if (!rows.length) return;
  const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function CodeRequestsPage() {
  const [legends, setLegends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ legendId: '', quantity: 25, prefix: '', reason: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  async function reloadRequests() {
    const requestsResult = await getMyCodeRequests();
    setRequests(requestsResult.data ?? []);
    if (requestsResult.error) setError(requestsResult.error);
  }

  useEffect(() => {
    async function loadData() {
      const [legendsResult, requestsResult] = await Promise.all([
        getMyLegends(),
        getMyCodeRequests(),
      ]);

      setLegends(legendsResult.data ?? []);
      setRequests(requestsResult.data ?? []);
      setForm((current) => ({ ...current, legendId: legendsResult.data?.[0]?.id || '' }));
      setError(legendsResult.error || requestsResult.error);
      setLoading(false);
    }

    loadData();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const visibleCodes = useMemo(() => getVisibleCodes(requests), [requests]);

  function exportRequestCodes(request) {
    const codes = getVisibleCodes([request]);
    downloadCsv(`codigos-${request.legends?.slug || request.id}.csv`, [
      ['codigo', 'estado', 'leyenda', 'solicitud', 'lote'],
      ...codes.map((code) => [
        code.display_code,
        code.status || 'unused',
        request.legends?.title || '',
        request.id,
        code.batch_id || '',
      ]),
    ]);
  }

  function exportAllCodes() {
    downloadCsv('codigos-del-autor.csv', [
      ['codigo', 'estado', 'leyenda', 'solicitud', 'lote'],
      ...visibleCodes.map((code) => [
        code.display_code,
        code.status || 'unused',
        code.request?.legends?.title || '',
        code.request?.id || '',
        code.batch_id || '',
      ]),
    ]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const { data, error: submitError } = await selfGenerateCodes(
      form.legendId,
      form.quantity,
      form.prefix,
      form.reason,
    );

    setSubmitting(false);

    if (submitError) {
      setError(submitError);
      return;
    }

    await reloadRequests();
    setForm((current) => ({ ...current, quantity: 25, prefix: '', reason: '' }));

    if (data?.outcome === 'generated') {
      const remaining = Number.isFinite(data.remaining_quota) ? ` Cupo restante: ${data.remaining_quota}.` : '';
      setMessage(`${data.message || 'Codigos generados.'}${remaining} Exportalos abajo.`);
    } else {
      setMessage(data?.message || 'Solicitud enviada. Un administrador la revisara.');
    }
  }

  if (loading) return <LoadingState message="Cargando solicitudes..." />;

  return (
    <section className="page-stack creator-panel">
      <div>
        <p className="eyebrow">Edicion fisica</p>
        <h1>Solicitudes de codigos</h1>
        <p className="state-message">Genera codigos para tus ediciones fisicas. Si tienes cupo asignado, se crean al instante; si no, tu solicitud pasa a revision del administrador.</p>
      </div>

      {error && <p className="error-message">{error.message}</p>}
      {message && <p className="success-message">{message}</p>}

      <Card>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field" htmlFor="code-legend">
            <span>Leyenda propia</span>
            <select
              id="code-legend"
              className="select"
              value={form.legendId}
              onChange={(event) => updateField('legendId', event.target.value)}
              required
            >
              {legends.length === 0 && <option value="">Sin leyendas disponibles</option>}
              {legends.map((legend) => <option key={legend.id} value={legend.id}>{legend.title}</option>)}
            </select>
          </label>
          <label className="field" htmlFor="code-quantity">
            <span>Cantidad</span>
            <input
              id="code-quantity"
              className="input standalone-input"
              type="number"
              min="1"
              value={form.quantity}
              onChange={(event) => updateField('quantity', event.target.value)}
              required
            />
          </label>
          <label className="field form-span-2" htmlFor="code-prefix">
            <span>Prefijo (opcional)</span>
            <input
              id="code-prefix"
              className="input standalone-input"
              value={form.prefix}
              onChange={(event) => updateField('prefix', event.target.value)}
              placeholder="Ej. BRUJA (2-10 letras/numeros). Si lo dejas vacio se usa BAC."
              maxLength={10}
            />
          </label>
          <label className="field form-span-2" htmlFor="code-reason">
            <span>Razon</span>
            <textarea
              id="code-reason"
              className="textarea"
              rows={4}
              value={form.reason}
              onChange={(event) => updateField('reason', event.target.value)}
              placeholder="Ejemplo: primera edicion fisica para presentacion escolar."
              required
            />
          </label>
          <div className="form-actions form-span-2">
            <Button type="submit" disabled={submitting || legends.length === 0}>
              {submitting ? 'Procesando...' : 'Generar / solicitar codigos'}
            </Button>
          </div>
        </form>
      </Card>

      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Historial</p>
          <h2>Solicitudes y codigos generados</h2>
        </div>
        <Button type="button" variant="ghost" onClick={exportAllCodes} disabled={visibleCodes.length === 0}>
          Exportar codigos
        </Button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Leyenda</th>
              <th>Cantidad</th>
              <th>Estado</th>
              <th>Codigos visibles</th>
              <th>Motivo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={6}>Aun no has solicitado codigos para ediciones fisicas.</td>
              </tr>
            ) : requests.map((request) => {
              const requestCodes = getVisibleCodes([request]);
              return (
                <tr key={request.id}>
                  <td>{request.legends?.title || 'Leyenda'}</td>
                  <td>{getRequestQuantity(request)}</td>
                  <td>
                    <div className="code-status-cell">
                      <StatusBadge status={request.status || 'pending'} context="code" size="small" />
                      {request.status === 'rejected' && request.admin_feedback && (
                        <small className="code-status-feedback">Motivo: {request.admin_feedback}</small>
                      )}
                    </div>
                  </td>
                  <td>{requestCodes.length}</td>
                  <td>{request.reason || '-'}</td>
                  <td>
                    <Button type="button" variant="ghost" onClick={() => exportRequestCodes(request)} disabled={requestCodes.length === 0}>
                      Exportar
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {visibleCodes.length > 0 && (
        <Card>
          <h2>Codigos disponibles</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Leyenda</th>
                  <th>Estado</th>
                  <th>Lote</th>
                </tr>
              </thead>
              <tbody>
                {visibleCodes.map((code) => (
                  <tr key={code.id}>
                    <td><strong>{code.display_code}</strong></td>
                    <td>{code.request?.legends?.title || 'Leyenda'}</td>
                    <td><StatusBadge status={code.status || 'unused'} context="code" size="small" /></td>
                    <td>{String(code.batch_id || '').slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

    </section>
  );
}

export default CodeRequestsPage;
