import React, { useState } from 'react';
import {
  X,
  ClipboardCheck,
  Package,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import { Product } from '../types';
import { formatCurrency, formatNumber } from '../lib/utils';

interface AuditReconcileModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSaveAudit: (audits: Array<{ productId: string; countedStock: number; notes?: string }>, responsible: string) => Promise<void>;
}

export const AuditReconcileModal: React.FC<AuditReconcileModalProps> = ({
  isOpen,
  onClose,
  products,
  onSaveAudit,
}) => {
  // Map of productId -> counted stock string
  const [counts, setCounts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    products.forEach((p) => {
      initial[p.id] = String(p.currentStock);
    });
    return initial;
  });

  const [responsible, setResponsible] = useState('Auditor de Estoque');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate discrepancies
  let totalDifferences = 0;
  let totalPositiveDiff = 0;
  let totalNegativeDiff = 0;
  let totalCostImpact = 0;
  const changesToApply: Array<{ productId: string; countedStock: number; notes?: string }> = [];

  products.forEach((p) => {
    const counted = parseFloat(counts[p.id]);
    if (!isNaN(counted) && counted !== p.currentStock) {
      const diff = counted - p.currentStock;
      totalDifferences++;
      if (diff > 0) totalPositiveDiff += diff;
      else totalNegativeDiff += Math.abs(diff);

      totalCostImpact += diff * p.costPrice;
      changesToApply.push({
        productId: p.id,
        countedStock: counted,
        notes: notes || `Balanço físico: De ${p.currentStock} para ${counted} ${p.unit}`,
      });
    }
  });

  const handleApply = async () => {
    if (changesToApply.length === 0) {
      setErrorMsg('Nenhuma alteração foi realizada nas contagens dos itens.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onSaveAudit(changesToApply, responsible);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao aplicar balanço físico.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="audit-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto"
    >
      <div
        id="audit-modal-container"
        className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-6 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Balanço & Conferência Física de Estoque
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Insira a contagem real encontrada no depósito para ajuste automático.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary of Discrepancies */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Itens com Diferença</span>
            <span className="text-base font-black text-slate-900 dark:text-slate-100">
              {totalDifferences} de {products.length}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Sobras (+)</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              +{formatNumber(totalPositiveDiff)} un
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Faltas / Perdas (-)</span>
            <span className="text-base font-bold text-red-600 dark:text-red-400">
              -{formatNumber(totalNegativeDiff)} un
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Impacto Financeiro</span>
            <span
              className={`text-base font-bold ${
                totalCostImpact >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatCurrency(totalCostImpact)}
            </span>
          </div>
        </div>

        {/* Body list */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-2.5">
            {products.map((product) => {
              const counted = parseFloat(counts[product.id]);
              const validCounted = !isNaN(counted) ? counted : product.currentStock;
              const diff = validCounted - product.currentStock;

              return (
                <div
                  key={product.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    diff !== 0
                      ? diff > 0
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80'
                        : 'bg-red-50/40 dark:bg-red-950/20 border-red-300 dark:border-red-800/80'
                      : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                        {product.code}
                      </span>
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {product.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>Categoria: {product.category}</span>
                      {product.location && <span>• Local: {product.location}</span>}
                      <span>• Custo: {formatCurrency(product.costPrice)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 justify-between sm:justify-end">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">No Sistema</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {product.currentStock} {product.unit}
                      </span>
                    </div>

                    <div className="w-28">
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">
                        Contagem Real
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={counts[product.id] ?? ''}
                        onChange={(e) =>
                          setCounts((prev) => ({ ...prev, [product.id]: e.target.value }))
                        }
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-900 dark:text-slate-100 text-center focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="w-20 text-right">
                      <span className="text-[10px] text-slate-400 block">Diferença</span>
                      {diff === 0 ? (
                        <span className="text-xs font-semibold text-slate-400">0</span>
                      ) : diff > 0 ? (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-0.5">
                          <TrendingUp className="w-3 h-3" /> +{diff}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center justify-end gap-0.5">
                          <TrendingDown className="w-3 h-3" /> {diff}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Responsável pelo Balanço
              </label>
              <input
                type="text"
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Motivo / Justificativa Geral
              </label>
              <input
                type="text"
                placeholder="Ex: Auditoria Trimestral / Fechamento de Mês"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {totalDifferences > 0 ? (
              <span>
                Serão gerados <strong>{totalDifferences}</strong> lançamentos de ajuste automático.
              </span>
            ) : (
              <span>Nenhuma divergência informada.</span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              id="confirm-audit-apply-btn"
              type="button"
              onClick={handleApply}
              disabled={isSubmitting || totalDifferences === 0}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Aplicando...' : 'Aplicar Balanço ao Estoque'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
