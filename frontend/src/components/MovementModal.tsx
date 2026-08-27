import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Barcode,
  Camera,
  Search,
  Package,
  Calendar,
  User,
  FileText,
  AlertCircle,
  CheckCircle2,
  Tag,
  Wrench,
} from 'lucide-react';
import { Produto, TipoMovimentacao, EntryReason, ExitReason } from '../types';
import { formatCurrency, getStockStatus } from '../lib/utils';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (movementData: any) => Promise<void>;
  products: Produto[];
  initialType?: TipoMovimentacao;
  preselectedProduct?: Produto | null;
}

const ENTRY_REASONS: EntryReason[] = [
  'Compra / Reposição de Sobressalentes',
  'Devolução de Sobra de O.S.',
  'Entrada por Fabricação Interna / Usinagem',
  'Retorno de Recuperação / Recondicionamento',
  'Ajuste de Inventário (+)',
  'Transferência entre Almoxarifados',
  'Outros',
];

const EXIT_REASONS: ExitReason[] = [
  'Aplicação em O.S. Preventiva',
  'Aplicação em O.S. Corretiva (Urgente)',
  'Aplicação em O.S. Preditiva',
  'Aplicação em Reforma / Melhoria / Capex',
  'Uso e Consumo em Oficina',
  'Envio para Recondicionamento Externo',
  'Descarte / Sucata / Danificado',
  'Ajuste de Inventário (-)',
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
  const [type, setType] = useState<TipoMovimentacao>(initialType);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [preco_unitario, setUnitPrice] = useState('');
  const [reason, setReason] = useState('');
  const [numero_documento, setDocumentNumber] = useState('');
  const [nome_contato, setContactName] = useState('');
  const [codusuario, setResponsible] = useState('Almoxarife / Técnico');
  const [observacoes, setNotes] = useState('');
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
        setUnitPrice(String(targetProd.preco_custo || 0));
        if (initialType === 'IN') {
          setContactName(targetProd.codfornecedor || '');
        } else {
          setContactName(targetProd.tag_equipamento ? `TAG: ${targetProd.tag_equipamento}` : '');
        }
      } else {
        setSelectedProductId('');
        setUnitPrice('');
        setContactName('');
      }
      setReason(
        initialType === 'IN'
          ? 'Compra / Reposição de Sobressalentes'
          : 'Aplicação em O.S. Preventiva'
      );
      setQuantity('1');
      setDocumentNumber('');
      setNotes('');
      setDate(new Date().toISOString().slice(0, 16));
      setErrorMsg(null);
      setProductSearch('');
    }
  }, [isOpen, initialType, preselectedProduct, products]);

  // When type changes, update default reason and price
  const handleTypeChange = (newType: TipoMovimentacao) => {
    setType(newType);
    setReason(
      newType === 'IN'
        ? 'Compra / Reposição de Sobressalentes'
        : 'Aplicação em O.S. Preventiva'
    );
    const selectedProd = products.find((p) => p.id === selectedProductId);
    if (selectedProd) {
      setUnitPrice(String(selectedProd.preco_custo || 0));
      if (newType === 'IN' && selectedProd.codfornecedor) {
        setContactName(selectedProd.codfornecedor);
      } else if (newType === 'OUT' && selectedProd.tag_equipamento) {
        setContactName(`TAG: ${selectedProd.tag_equipamento}`);
      }
    }
  };

  const handleProductSelect = (prod: Produto) => {
    setSelectedProductId(prod.id);
    setUnitPrice(String(prod.preco_custo || 0));
    if (type === 'IN' && prod.codfornecedor) {
      setContactName(prod.codfornecedor);
    } else if (type === 'OUT' && prod.tag_equipamento) {
      setContactName(`TAG: ${prod.tag_equipamento}`);
    }
  };

  const handleBarcodeScan = (scannedCode: string) => {
    setIsScannerOpen(false);
    const found = products.find(
      (p) =>
        p.barcode === scannedCode ||
        p.code.toLowerCase() === scannedCode.toLowerCase()
    );
    if (found) {
      handleProductSelect(found);
    } else {
      setErrorMsg(
        `Nenhuma peça encontrada com o código "${scannedCode}". Cadastre o sobressalente primeiro.`
      );
    }
  };

  const currentProduct = products.find((p) => p.id === selectedProductId);

  // Calculations
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(preco_unitario) || 0;
  const totalValue = qty * price;
  const estoque_atual = currentProduct ? currentProduct.estoque_atual : 0;
  const resultingStock =
    type === 'IN' ? estoque_atual + qty : estoque_atual - qty;
  const isOverdraft = type === 'OUT' && resultingStock < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setErrorMsg('Selecione uma peça / sobressalente.');
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
        codproduto: selectedProductId,
        type,
        quantity: qty,
        preco_unitario: price,
        reason,
        numero_documento: numero_documento.trim() || undefined,
        nome_contato: nome_contato.trim() || undefined,
        codusuario: codusuario.trim() || 'Almoxarife / Técnico',
        observacoes: observacoes.trim() || undefined,
        data_movimentacao: date ? new Date(date).toISOString() : new Date().toISOString(),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao registrar movimentação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products by search query
  const filteredProducts = products.filter((p) => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.tag_equipamento && p.tag_equipamento.toLowerCase().includes(q)) ||
      p.codcategoria.toLowerCase().includes(q)
    );
  });

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
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
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
                  {type === 'IN'
                    ? 'Entrada no Almoxarifado'
                    : 'Baixa / Aplicação em O.S.'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {type === 'IN'
                    ? 'Recebimento de compra, retorno de usinagem ou devolução de sobra'
                    : 'Baixa de peças para Ordens de Serviço, máquinas ou reformas'}
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
                  <ArrowUpRight className="w-3.5 h-3.5" /> Saída (O.S.)
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

            {/* Produto Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Peça / Sobressalente *
              </label>

              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="movement-product-search-input"
                    type="text"
                    placeholder="Buscar por nome, SKU, TAG de máquina ou código de barras..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
                <button
                  id="movement-scan-barcode-btn"
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  title="Escanear com Câmera do Celular"
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl flex items-center gap-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Bipar Câmera</span>
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
                    [{p.code}] {p.name} {p.tag_equipamento ? `(TAG: ${p.tag_equipamento})` : ''} - Saldo: {p.estoque_atual} {p.unidade_medida}
                  </option>
                ))}
              </select>

              {/* Selected Produto Card Summary */}
              {currentProduct && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    {currentProduct.url_imagem ? (
                      <img
                        src={currentProduct.url_imagem}
                        alt={currentProduct.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-white"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                        {currentProduct.name}
                      </div>
                      <div className="text-slate-400 text-[11px] flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono">{currentProduct.code}</span>
                        <span>•</span>
                        <span>{currentProduct.codcategoria}</span>
                        {currentProduct.localizacao_estoque && (
                          <>
                            <span>•</span>
                            <span>{currentProduct.localizacao_estoque}</span>
                          </>
                        )}
                        {currentProduct.tag_equipamento && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              TAG: {currentProduct.tag_equipamento}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Saldo Atual:</span>{' '}
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {currentProduct.estoque_atual} {currentProduct.unidade_medida}
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
                  Quantidade ({currentProduct?.unidade_medida || 'UN'}) *
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
                  Custo Unitário (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    R$
                  </span>
                  <input
                    id="movement-unidade_medida-price-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={preco_unitario}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Custo Total Movimentado
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
                    Saldo: <strong>{estoque_atual}</strong> {type === 'IN' ? '+' : '-'} {qty} ={' '}
                    <strong>{resultingStock}</strong> {currentProduct.unidade_medida}
                  </span>
                </div>
                {isOverdraft && (
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    Atenção: A baixa excede o saldo físico no almoxarifado!
                  </span>
                )}
              </div>
            )}

            {/* Reason and Document */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Motivo / Finalidade da Movimentação *
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
                  {type === 'IN' ? 'Nº da Nota Fiscal / Pedido' : 'Nº da O.S. (Ordem de Serviço)'}
                </label>
                <input
                  id="movement-document-input"
                  type="text"
                  placeholder={type === 'IN' ? 'Ex: NF-10492 ou PED-SKF-89' : 'Ex: OS-2026-089 ou OS-PREV-12'}
                  value={numero_documento}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {type === 'IN' ? 'Fornecedor / Fabricante' : 'TAG do Equipamento / Destino'}
                </label>
                <input
                  id="movement-contact-input"
                  type="text"
                  placeholder={
                    type === 'IN'
                      ? 'Ex: SKF Distribuidora Brasil'
                      : 'Ex: TAG: PRE-HY-02 ou Esteira 01'
                  }
                  value={nome_contato}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Técnico / Mecânico / Almoxarife
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="movement-codusuario-input"
                    type="text"
                    placeholder="Ex: Mecânico André / Carlos"
                    value={codusuario}
                    onChange={(e) => setResponsible(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data e Hora do Registro
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
                  Observações Técnicas / Diagnóstico da O.S.
                </label>
                <textarea
                  id="movement-observacoes-input"
                  rows={2}
                  placeholder="Ex: Troca preventiva de rolamentos devido a vibração detectada na análise preditiva..."
                  value={observacoes}
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
                  : 'Confirmar Baixa em O.S.'}
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
