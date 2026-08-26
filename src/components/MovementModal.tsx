import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Package,
  Calendar,
  User,
  FileText,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Barcode,
  Camera,
} from 'lucide-react';
import { Product, MovementType, EntryReason, ExitReason } from '../types';
import { formatCurrency, formatNumber, getStockStatus } from '../lib/utils';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (movementData: any) => Promise<void>;
  products: Product[];
  initialType?: MovementType;
  preselectedProduct?: Product | null;
}

const ENTRY_REASONS: EntryReason[] = [
  'Compra de Fornecedor',
  'Devolução de Cliente',
  'Entrada de Produção',
  'Ajuste de Balanço (+)',
  'Transferência Recebida',
  'Outros',
];

const EXIT_REASONS: ExitReason[] = [
  'Venda / Pedido',
  'Uso e Consumo Interno',
  'Avaria / Vencimento / Perda',
  'Devolução a Fornecedor',
  'Amostra Grátis / Brinde',
  'Ajuste de Balanço (-)',
  'Transferência Enviada',
  'Outros',
];

export const MovementModal: React.FC<MovementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  products,
  initialType = 'IN',
  preselectedProduct = null,
}) => {
  const [type, setType] = useState<MovementType>(initialType);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [reason, setReason] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [responsible, setResponsible] = useState('Almoxarife');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize or reset form on open
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      const targetProd = preselectedProduct || (products.length > 0 ? products[0] : null);
      if (targetProd) {
        setSelectedProductId(targetProd.id);
        setUnitPrice(
          String(initialType === 'IN' ? targetProd.costPrice : targetProd.sellingPrice)
        );
        if (initialType === 'IN') {
          setContactName(targetProd.supplier || '');
        } else {
          setContactName('');
        }
      } else {
        setSelectedProductId('');
        setUnitPrice('');
        setContactName('');
      }
      setReason(initialType === 'IN' ? 'Compra de Fornecedor' : 'Venda / Pedido');
      setQuantity('1');
      setDocumentNumber('');
      setNotes('');
      setDate(new Date().toISOString().slice(0, 16));
      setErrorMsg(null);
      setProductSearch('');
    }
  }, [isOpen, initialType, preselectedProduct, products]);

  // When type changes, update default reason and price
  const handleTypeChange = (newType: MovementType) => {
    setType(newType);
    setReason(newType === 'IN' ? 'Compra de Fornecedor' : 'Venda / Pedido');
    const selectedProd = products.find((p) => p.id === selectedProductId);
    if (selectedProd) {
      setUnitPrice(
        String(newType === 'IN' ? selectedProd.costPrice : selectedProd.sellingPrice)
      );
      if (newType === 'IN' && selectedProd.supplier) {
        setContactName(selectedProd.supplier);
      }
    }
  };

  const handleProductSelect = (prod: Product) => {
    setSelectedProductId(prod.id);
    setUnitPrice(String(type === 'IN' ? prod.costPrice : prod.sellingPrice));
    if (type === 'IN' && prod.supplier) {
      setContactName(prod.supplier);
    }
    setProductSearch('');
  };

  const currentProduct = products.find((p) => p.id === selectedProductId);
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const totalValue = qty * price;

  // Calculated resulting stock
  const currentStock = currentProduct ? currentProduct.currentStock : 0;
  const resultingStock =
    type === 'IN'
      ? currentStock + qty
      : Math.max(0, currentStock - qty);

  const isOverdraft = type === 'OUT' && qty > currentStock;

  // Filter products for search
  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true;
    const term = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.toLowerCase().includes(term)) ||
      p.category.toLowerCase().includes(term)
    );
  });

  const handleBarcodeScan = (scanned: string) => {
    const found = products.find(
      (p) =>
        p.barcode === scanned ||
        p.code.toLowerCase() === scanned.toLowerCase() ||
        p.id === scanned
    );
    if (found) {
      handleProductSelect(found);
    } else {
      setProductSearch(scanned);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setErrorMsg('Selecione um produto para movimentar.');
      return;
    }
    if (qty <= 0) {
      setErrorMsg('A quantidade deve ser maior que zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onSave({
        productId: selectedProductId,
        type,
        quantity: qty,
        unitPrice: price,
        reason,
        documentNumber,
        contactName,
        responsible,
        notes,
        timestamp: new Date(date).toISOString(),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao lançar movimentação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        id="movement-modal-overlay"
        className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto"
      >
        <div
          id="movement-modal-container"
          className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header with Type Selector */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  type === 'IN'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                }`}
              >
                {type === 'IN' ? (
                  <ArrowDownLeft className="w-5 h-5" />
                ) : (
                  <ArrowUpRight className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {type === 'IN' ? 'Registrar Entrada de Estoque' : 'Registrar Saída de Estoque'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {type === 'IN'
                    ? 'Adicione itens recebidos por compra, devolução ou ajuste'
                    : 'Dê baixa por venda, consumo, perda ou remessa'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  id="tab-select-in-btn"
                  type="button"
                  onClick={() => handleTypeChange('IN')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    type === 'IN'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" /> Entrada
                </button>
                <button
                  id="tab-select-out-btn"
                  type="button"
                  onClick={() => handleTypeChange('OUT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    type === 'OUT'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> Saída
                </button>
              </div>
              <button
                id="close-movement-modal-btn"
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Product Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Produto *
              </label>

              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="movement-product-search-input"
                    type="text"
                    placeholder="Buscar por nome, código SKU ou código de barras..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
                <button
                  id="movement-scan-barcode-btn"
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  title="Escanear com Câmera"
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl flex items-center gap-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Escanear</span>
                </button>
              </div>

              {/* Select Dropdown */}
              <select
                id="movement-product-select"
                value={selectedProductId}
                onChange={(e) => {
                  const prod = products.find((p) => p.id === e.target.value);
                  if (prod) handleProductSelect(prod);
                }}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all"
              >
                {filteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.code}] {p.name} - Estoque Atual: {p.currentStock} {p.unit}
                  </option>
                ))}
              </select>

              {/* Selected Product Card Summary */}
              {currentProduct && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {currentProduct.name}
                      </span>
                      <span className="text-slate-400 ml-1.5">
                        ({currentProduct.category} | {currentProduct.location || 'Sem localização'})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Saldo Atual:</span>{' '}
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {currentProduct.currentStock} {currentProduct.unit}
                      </span>
                    </div>
                    {(() => {
                      const status = getStockStatus(currentProduct);
                      return (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.bg} ${status.color} ${status.border}`}
                        >
                          {status.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Quantity, Unit Price and Resulting Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Quantidade ({currentProduct?.unit || 'UN'}) *
                </label>
                <input
                  id="movement-quantity-input"
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {type === 'IN' ? 'Preço de Custo (R$)' : 'Preço de Saída (R$)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    R$
                  </span>
                  <input
                    id="movement-unit-price-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Valor Total Previsto
                </label>
                <div className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  <span>{formatCurrency(totalValue)}</span>
                </div>
              </div>
            </div>

            {/* Live Stock Projection Pill */}
            {currentProduct && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  isOverdraft
                    ? 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                    : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span>
                    Saldo: <strong>{currentStock}</strong> {type === 'IN' ? '+' : '-'} {qty} ={' '}
                    <strong>{resultingStock}</strong> {currentProduct.unit}
                  </span>
                </div>
                {isOverdraft && (
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    Aviso: Saída superior ao saldo em estoque!
                  </span>
                )}
              </div>
            )}

            {/* Reason and Document */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Motivo da Movimentação *
                </label>
                <select
                  id="movement-reason-select"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                >
                  {type === 'IN'
                    ? ENTRY_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))
                    : EXIT_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Documento / NF / Pedido / Requisição
                </label>
                <input
                  id="movement-document-input"
                  type="text"
                  placeholder="Ex: NF-10492 ou PED-3021"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {type === 'IN' ? 'Fornecedor / Origem' : 'Cliente / Solicitante / Destino'}
                </label>
                <input
                  id="movement-contact-input"
                  type="text"
                  placeholder={
                    type === 'IN' ? 'Ex: Fornecedor ABC' : 'Ex: Cliente ou Manutenção'
                  }
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Responsável pelo Lançamento
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="movement-responsible-input"
                    type="text"
                    placeholder="Ex: Carlos (Almoxarifado)"
                    value={responsible}
                    onChange={(e) => setResponsible(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data e Hora do Movimento
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="movement-datetime-input"
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Observações Adicionais
                </label>
                <textarea
                  id="movement-notes-input"
                  rows={2}
                  placeholder="Informações extras, estado da embalagem, transportadora, etc..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                id="cancel-movement-btn"
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                id="confirm-movement-btn"
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-2.5 text-white text-sm font-semibold rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50 ${
                  type === 'IN'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting
                  ? 'Registrando...'
                  : type === 'IN'
                  ? 'Confirmar Entrada'
                  : 'Confirmar Saída'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
      />
    </>
  );
};
