import React, { useState, useMemo } from 'react';
import {
  ArrowUpRight,
  Plus,
  Search,
  Calendar,
  Filter,
  Download,
  Building2,
  FileText,
  User,
  Trash2,
  DollarSign,
  Package,
  Clock,
  TrendingDown,
} from 'lucide-react';
import { Movimentacao, Produto } from '../types';
import { formatCurrency, formatDate, formatNumber, exportToCSV } from '../lib/utils';

interface ExitsViewProps {
  movements: Movimentacao[];
  products: Produto[];
  onNewExit: () => void;
  onDeleteMovement: (movementId: string) => Promise<void>;
}

export const ExitsView: React.FC<ExitsViewProps> = ({
  movements,
  products,
  onNewExit,
  onDeleteMovement,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReason, setSelectedReason] = useState('ALL');
  const [period, setPeriod] = useState<'ALL' | 'today' | '7days' | '30days'>('ALL');
  const [movementToDelete, setMovementToDelete] = useState<Movimentacao | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter only 'OUT' movements
  const outMovements = useMemo(() => {
    return movements.filter((m) => m.type === 'OUT');
  }, [movements]);

  // Extract unique reasons
  const reasons = useMemo(() => {
    const set = new Set<string>();
    outMovements.forEach((m) => {
      if (m.reason) set.add(m.reason);
    });
    return Array.from(set).sort();
  }, [outMovements]);

  // Apply filters
  const filteredMovements = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;

    return outMovements.filter((m) => {
      // Reason filter
      if (selectedReason !== 'ALL' && m.reason !== selectedReason) {
        return false;
      }

      // Period filter
      const mTime = new Date(m.data_movimentacao).getTime();
      if (period === 'today' && mTime < todayStart) return false;
      if (period === '7days' && mTime < sevenDaysAgo) return false;
      if (period === '30days' && mTime < thirtyDaysAgo) return false;

      // Search text
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesProd = m.nome.toLowerCase().includes(term);
        const matchesCode = m.codigo_interno.toLowerCase().includes(term);
        const matchesDoc = m.numero_documento?.toLowerCase().includes(term);
        const matchesContact = m.nome_contato?.toLowerCase().includes(term);
        const matchesResp = m.codusuario.toLowerCase().includes(term);
        const matchesReason = m.reason.toLowerCase().includes(term);
        return matchesProd || matchesCode || matchesDoc || matchesContact || matchesResp || matchesReason;
      }

      return true;
    });
  }, [outMovements, selectedReason, period, searchTerm]);

  // Summary Metrics for filtered exits
  const metrics = useMemo(() => {
    let totalQty = 0;
    let totalValue = 0;
    filteredMovements.forEach((m) => {
      totalQty += m.quantity;
      totalValue += m.preco_total || m.quantity * m.preco_unitario;
    });

    return {
      count: filteredMovements.length,
      totalQty,
      totalValue,
    };
  }, [filteredMovements]);

  const handleExportCSV = () => {
    const rows = filteredMovements.map((m) => ({
      'Data e Hora': formatDate(m.data_movimentacao),
      Código: m.codigo_interno,
      Produto: m.nome,
      Quantidade: m.quantity,
      'Preço Unitário (R$)': m.preco_unitario.toFixed(2),
      'Valor Total (R$)': m.preco_total.toFixed(2),
      'Estoque Anterior': m.estoque_anterior,
      'Estoque Resultante': m.estoque_novo,
      Motivo: m.reason,
      'Documento / Pedido': m.numero_documento || '',
      'Destino / Cliente / Setor': m.nome_contato || '',
      Responsável: m.codusuario,
      Observações: m.observacoes || '',
    }));
    exportToCSV(`Historico_Saidas_${new Date().toISOString().slice(0, 10)}`, rows);
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
            <ArrowUpRight className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            Histórico de Saídas & Baixas em O.S.
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Registro de aplicação de peças em Ordem de Serviço, preventiva, corretiva e perdas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="export-exits-csv-btn"
            type="button"
            onClick={handleExportCSV}
            title="Exportar Saídas CSV"
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>

          <button
            id="new-exit-action-btn"
            type="button"
            onClick={onNewExit}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md shadow-amber-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Saída de Estoque</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total de Saídas Registradas
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
              {metrics.count} baixas
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Volume Físico Despachado
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
              {formatNumber(metrics.totalQty)} unidades
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Valor Financeiro Total das Saídas
            </div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight mt-0.5">
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
            id="exits-search-input"
            type="text"
            placeholder="Buscar por produto, código, pedido, cliente, setor ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
          />
        </div>

        <div className="w-full md:w-56">
          <select
            id="exits-reason-filter"
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 transition-all"
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
          <ArrowUpRight className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Nenhuma saída registrada
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedReason !== 'ALL' || period !== 'ALL'
              ? 'Nenhum lançamento corresponde aos filtros selecionados.'
              : 'Clique no botão acima para registrar vendas, consumos ou baixas de estoque.'}
          </p>
          <button
            type="button"
            onClick={onNewExit}
            className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Registrar Saída
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
                  <th className="py-3 px-4 text-right">Preço Unit.</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4">Motivo / Documento</th>
                  <th className="py-3 px-4">Destino / Cliente</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4 text-center">Estornar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredMovements.map((movement) => {
                  const prod = products.find((p) => p.id === movement.codproduto);
                  const unidade_medida = prod?.unidade_medida || 'UN';

                  return (
                    <tr
                      key={movement.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(movement.data_movimentacao)}</span>
                        </div>
                      </td>

                      {/* Produto */}
                      <td className="py-3.5 px-4 min-w-[200px] max-w-sm">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 break-words leading-snug">
                          {movement.nome}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {movement.codigo_interno}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold text-xs">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          -{formatNumber(movement.quantity)} {unidade_medida}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Saldo: {movement.estoque_anterior} → {movement.estoque_novo}
                        </div>
                      </td>

                      {/* Prices */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {formatCurrency(movement.preco_unitario)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-amber-700 dark:text-amber-400">
                        {formatCurrency(movement.preco_total)}
                      </td>

                      {/* Reason & Doc */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {movement.reason}
                        </div>
                        {movement.numero_documento && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <FileText className="w-3 h-3" /> {movement.numero_documento}
                          </div>
                        )}
                      </td>

                      {/* Contact / Customer */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 min-w-[140px]">
                        {movement.nome_contato ? (
                          <div className="flex items-center gap-1 text-xs break-words">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="break-words">{movement.nome_contato}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Responsible */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-xs">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{movement.codusuario}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setMovementToDelete(movement)}
                          title="Estornar Saída (Devolve a quantidade ao estoque)"
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
                Estornar Saída de Estoque
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Deseja desfazer a saída de <strong>-{movementToDelete.quantity}</strong> do produto{' '}
              <strong>"{movementToDelete.nome}"</strong>? O estoque do item será devolvido
              automaticamente ao saldo.
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
