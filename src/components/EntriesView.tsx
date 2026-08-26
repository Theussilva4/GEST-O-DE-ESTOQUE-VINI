import React, { useState, useMemo } from 'react';
import {
  ArrowDownLeft,
  Plus,
  Search,
  Calendar,
  Filter,
  Download,
  Building2,
  FileText,
  User,
  Trash2,
  CheckCircle2,
  DollarSign,
  Package,
  Clock,
  Layers,
} from 'lucide-react';
import { Movement, Product } from '../types';
import { formatCurrency, formatDate, formatNumber, exportToCSV } from '../lib/utils';

interface EntriesViewProps {
  movements: Movement[];
  products: Product[];
  onNewEntry: () => void;
  onDeleteMovement: (movementId: string) => Promise<void>;
}

export const EntriesView: React.FC<EntriesViewProps> = ({
  movements,
  products,
  onNewEntry,
  onDeleteMovement,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReason, setSelectedReason] = useState('ALL');
  const [period, setPeriod] = useState<'ALL' | 'today' | '7days' | '30days'>('ALL');
  const [movementToDelete, setMovementToDelete] = useState<Movement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter only 'IN' movements
  const inMovements = useMemo(() => {
    return movements.filter((m) => m.type === 'IN');
  }, [movements]);

  // Extract unique reasons
  const reasons = useMemo(() => {
    const set = new Set<string>();
    inMovements.forEach((m) => {
      if (m.reason) set.add(m.reason);
    });
    return Array.from(set).sort();
  }, [inMovements]);

  // Apply filters
  const filteredMovements = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;

    return inMovements.filter((m) => {
      // Reason filter
      if (selectedReason !== 'ALL' && m.reason !== selectedReason) {
        return false;
      }

      // Period filter
      const mTime = new Date(m.timestamp).getTime();
      if (period === 'today' && mTime < todayStart) return false;
      if (period === '7days' && mTime < sevenDaysAgo) return false;
      if (period === '30days' && mTime < thirtyDaysAgo) return false;

      // Search text
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesProd = m.productName.toLowerCase().includes(term);
        const matchesCode = m.productCode.toLowerCase().includes(term);
        const matchesDoc = m.documentNumber?.toLowerCase().includes(term);
        const matchesContact = m.contactName?.toLowerCase().includes(term);
        const matchesResp = m.responsible.toLowerCase().includes(term);
        const matchesReason = m.reason.toLowerCase().includes(term);
        return matchesProd || matchesCode || matchesDoc || matchesContact || matchesResp || matchesReason;
      }

      return true;
    });
  }, [inMovements, selectedReason, period, searchTerm]);

  // Summary Metrics for filtered entries
  const metrics = useMemo(() => {
    let totalQty = 0;
    let totalValue = 0;
    filteredMovements.forEach((m) => {
      totalQty += m.quantity;
      totalValue += m.totalPrice || m.quantity * m.unitPrice;
    });

    return {
      count: filteredMovements.length,
      totalQty,
      totalValue,
    };
  }, [filteredMovements]);

  const handleExportCSV = () => {
    const rows = filteredMovements.map((m) => ({
      'Data e Hora': formatDate(m.timestamp),
      Código: m.productCode,
      Produto: m.productName,
      Quantidade: m.quantity,
      'Preço de Custo (R$)': m.unitPrice.toFixed(2),
      'Valor Total (R$)': m.totalPrice.toFixed(2),
      'Estoque Anterior': m.previousStock,
      'Estoque Resultante': m.newStock,
      Motivo: m.reason,
      'Documento / NF': m.documentNumber || '',
      'Fornecedor / Origem': m.contactName || '',
      Responsável: m.responsible,
      Observações: m.notes || '',
    }));
    exportToCSV(`Historico_Entradas_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const confirmDelete = async () => {
    if (!movementToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteMovement(movementToDelete.id);
      setMovementToDelete(null);
    } catch (err) {
      console.error('Delete movement error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <ArrowDownLeft className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            Histórico de Entradas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Registro detalhado de compras, devoluções e reposições de estoque.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="export-entries-csv-btn"
            type="button"
            onClick={handleExportCSV}
            title="Exportar Entradas CSV"
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>

          <button
            id="new-entry-action-btn"
            type="button"
            onClick={onNewEntry}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Entrada de Estoque</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total de Entradas Registradas
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
              {metrics.count} lançamentos
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Volume Físico Recebido
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
              {formatNumber(metrics.totalQty)} unidades
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Valor Total em Compras
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5">
              {formatCurrency(metrics.totalValue)}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="entries-search-input"
            type="text"
            placeholder="Buscar por produto, código, NF, fornecedor ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        <div className="w-full md:w-56">
          <select
            id="entries-reason-filter"
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all"
          >
            <option value="ALL">Todos os Motivos</option>
            {reasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Period filter buttons */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setPeriod('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              period === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Todo o Histórico
          </button>
          <button
            type="button"
            onClick={() => setPeriod('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              period === 'today'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setPeriod('7days')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              period === '7days'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Últimos 7 dias
          </button>
          <button
            type="button"
            onClick={() => setPeriod('30days')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              period === '30days'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            30 dias
          </button>
        </div>
      </div>

      {/* Movements Table */}
      {filteredMovements.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <ArrowDownLeft className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Nenhuma entrada registrada
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedReason !== 'ALL' || period !== 'ALL'
              ? 'Nenhum lançamento corresponde aos filtros selecionados.'
              : 'Clique no botão acima para lançar sua primeira entrada de mercadorias.'}
          </p>
          <button
            type="button"
            onClick={onNewEntry}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Registrar Entrada
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Data & Hora</th>
                  <th className="py-3 px-4">Item / Código</th>
                  <th className="py-3 px-4 text-center">Quantidade</th>
                  <th className="py-3 px-4 text-right">Custo Unit.</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4">Motivo / Documento</th>
                  <th className="py-3 px-4">Origem / Fornecedor</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4 text-center">Estornar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredMovements.map((movement) => {
                  const prod = products.find((p) => p.id === movement.productId);
                  const unit = prod?.unit || 'UN';

                  return (
                    <tr
                      key={movement.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(movement.timestamp)}</span>
                        </div>
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {movement.productName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {movement.productCode}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          +{formatNumber(movement.quantity)} {unit}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Saldo: {movement.previousStock} → {movement.newStock}
                        </div>
                      </td>

                      {/* Prices */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {formatCurrency(movement.unitPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(movement.totalPrice)}
                      </td>

                      {/* Reason & Doc */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {movement.reason}
                        </div>
                        {movement.documentNumber && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <FileText className="w-3 h-3" /> {movement.documentNumber}
                          </div>
                        )}
                      </td>

                      {/* Contact / Supplier */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {movement.contactName ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[150px]">{movement.contactName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Responsible */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-xs">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{movement.responsible}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setMovementToDelete(movement)}
                          title="Estornar Entrada (Desfaz e diminui o estoque)"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete/Revert confirmation */}
      {movementToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Estornar Entrada de Estoque
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Deseja estornar a entrada de <strong>+{movementToDelete.quantity}</strong> do produto{' '}
              <strong>"{movementToDelete.productName}"</strong>? O estoque do item será reduzido
              automaticamente para desfazer esta operação.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMovementToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Estornando...' : 'Confirmar Estorno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
