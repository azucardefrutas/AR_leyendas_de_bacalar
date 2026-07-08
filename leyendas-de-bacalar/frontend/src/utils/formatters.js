export function formatPageTitle(title) {
  return title ? `${title} | Leyendas de Bacalar` : 'Leyendas de Bacalar';
}

export function formatMoney(amount, currency = 'MXN') {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '';
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency || 'MXN',
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)} ${currency || ''}`.trim();
  }
}

export function formatDate(value, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('es-MX', options).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

// Splits "49.00" into { whole: "49", cents: "00" } for large price displays.
export function splitPrice(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return { whole: '0', cents: '00' };
  const [whole, cents = '00'] = value.toFixed(2).split('.');
  return { whole: new Intl.NumberFormat('es-MX').format(Number(whole)), cents };
}
