import { Produto, Movimentacao, CriticidadeManutencao } from '../types';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateShort(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function getStockStatus(product: Produto): {
  label: string;
  color: string;
  bg: string;
  border: string;
  status: 'out' | 'low' | 'normal' | 'excess';
} {
  if (product.estoque_atual <= 0) {
    return {
      label: 'Esgotado',
      color: 'text-red-700 dark:text-red-300',
      bg: 'bg-red-50 dark:bg-red-950/50',
      border: 'border-red-200 dark:border-red-800',
      status: 'out',
    };
  }
  if (product.estoque_atual <= product.estoque_minimo) {
    return {
      label: 'Estoque Baixo',
      color: 'text-amber-700 dark:text-amber-300',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      border: 'border-amber-200 dark:border-amber-800',
      status: 'low',
    };
  }
  if (product.estoque_maximo && product.estoque_atual > product.estoque_maximo) {
    return {
      label: 'Excesso',
      color: 'text-blue-700 dark:text-blue-300',
      bg: 'bg-blue-50 dark:bg-blue-950/50',
      border: 'border-blue-200 dark:border-blue-800',
      status: 'excess',
    };
  }
  return {
    label: 'Normal',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    border: 'border-emerald-200 dark:border-emerald-800',
    status: 'normal',
  };
}

export function getCriticalityInfo(criticidade?: CriticidadeManutencao): {
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  border: string;
} {
  switch (criticidade) {
    case 'HIGH':
      return {
        label: 'Alta - Peça Crítica (Parada de Fábrica)',
        shortLabel: 'Crítica A',
        color: 'text-red-700 dark:text-red-300',
        bg: 'bg-red-100 dark:bg-red-950/70',
        border: 'border-red-300 dark:border-red-700',
      };
    case 'MEDIUM':
      return {
        label: 'Média - Importante',
        shortLabel: 'Média B',
        color: 'text-amber-700 dark:text-amber-300',
        bg: 'bg-amber-100 dark:bg-amber-950/70',
        border: 'border-amber-300 dark:border-amber-700',
      };
    case 'LOW':
    default:
      return {
        label: 'Baixa - Não Crítica / Geral',
        shortLabel: 'Geral C',
        color: 'text-slate-600 dark:text-slate-400',
        bg: 'bg-slate-100 dark:bg-slate-800',
        border: 'border-slate-300 dark:border-slate-700',
      };
  }
}

export function exportToCSV(filename: string, rows: Array<Record<string, any>>): void {
  if (!rows || !rows.length) return;
  const separator = ';';
  const keys = Object.keys(rows[0]);
  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    keys.join(separator) +
    '\n' +
    rows
      .map((row) =>
        keys
          .map((k) => {
            let val = row[k] === null || row[k] === undefined ? '' : String(row[k]);
            val = val.replace(/"/g, '""');
            if (val.search(/("|,|;|\n)/g) >= 0) {
              val = `"${val}"`;
            }
            return val;
          })
          .join(separator)
      )
      .join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

