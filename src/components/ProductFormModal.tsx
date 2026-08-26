import React, { useState, useEffect } from 'react';
import {
  X,
  PackagePlus,
  Barcode,
  Camera,
  Layers,
  DollarSign,
  Building2,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { Product, ProductUnit } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: any) => Promise<void>;
  productToEdit?: Product | null;
  existingCategories: string[];
}

const COMMON_UNITS: { value: ProductUnit; label: string }[] = [
  { value: 'UN', label: 'Unidade (UN)' },
  { value: 'KG', label: 'Quilograma (KG)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'CX', label: 'Caixa (CX)' },
  { value: 'M', label: 'Metro (M)' },
  { value: 'PAR', label: 'Par (PAR)' },
  { value: 'PCT', label: 'Pacote (PCT)' },
  { value: 'ROLO', label: 'Rolo (ROLO)' },
  { value: 'KIT', label: 'Kit (KIT)' },
];

const SUGGESTED_CATEGORIES = [
  'Fixação e Ferragens',
  'Ferramentas & Abrasivos',
  'EPI & Segurança',
  'Elétrica',
  'Hidráulica',
  'Lubrificantes & Químicos',
  'Pintura & Acabamento',
  'Materiais de Construção',
  'Eletrônicos & Acessórios',
  'Embalagens',
  'Outros',
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  productToEdit,
  existingCategories,
}) => {
  const isEditing = !!productToEdit;

  const [formData, setFormData] = useState({
    code: '',
    barcode: '',
    name: '',
    description: '',
    category: '',
    unit: 'UN' as ProductUnit,
    initialStock: '0',
    minStock: '5',
    maxStock: '',
    costPrice: '',
    sellingPrice: '',
    supplier: '',
    location: '',
    responsible: 'Almoxarife',
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state on open / edit
  useEffect(() => {
    if (productToEdit) {
      setFormData({
        code: productToEdit.code,
        barcode: productToEdit.barcode || '',
        name: productToEdit.name,
        description: productToEdit.description || '',
        category: productToEdit.category,
        unit: productToEdit.unit,
        initialStock: String(productToEdit.currentStock),
        minStock: String(productToEdit.minStock),
        maxStock: productToEdit.maxStock ? String(productToEdit.maxStock) : '',
        costPrice: String(productToEdit.costPrice || ''),
        sellingPrice: String(productToEdit.sellingPrice || ''),
        supplier: productToEdit.supplier || '',
        location: productToEdit.location || '',
        responsible: 'Almoxarife',
      });
    } else {
      setFormData({
        code: '',
        barcode: '',
        name: '',
        description: '',
        category: '',
        unit: 'UN',
        initialStock: '0',
        minStock: '5',
        maxStock: '',
        costPrice: '',
        sellingPrice: '',
        supplier: '',
        location: '',
        responsible: 'Almoxarife',
      });
    }
    setErrorMsg(null);
  }, [productToEdit, isOpen]);

  // Calculations for Margin
  const cost = parseFloat(formData.costPrice) || 0;
  const sell = parseFloat(formData.sellingPrice) || 0;
  const profitMargin = sell > 0 ? ((sell - cost) / sell) * 100 : 0;
  const profitValue = sell - cost;

  const allCategories = Array.from(
    new Set([...SUGGESTED_CATEGORIES, ...existingCategories])
  ).filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('O nome do produto é obrigatório.');
      return;
    }
    if (!formData.category.trim()) {
      setErrorMsg('A categoria do produto é obrigatória.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onSave({
        ...formData,
        initialStock: parseFloat(formData.initialStock) || 0,
        minStock: parseFloat(formData.minStock) || 0,
        maxStock: formData.maxStock ? parseFloat(formData.maxStock) : undefined,
        costPrice: parseFloat(formData.costPrice) || 0,
        sellingPrice: parseFloat(formData.sellingPrice) || 0,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao salvar o produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        id="product-form-modal-overlay"
        className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto"
      >
        <div
          id="product-form-container"
          className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <PackagePlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {isEditing ? 'Editar Dados do Produto' : 'Cadastrar Novo Produto'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isEditing
                    ? 'Atualize as informações cadastrais e preços do item'
                    : 'Preencha os dados para registrar o item no estoque'}
                </p>
              </div>
            </div>
            <button
              id="close-product-form-btn"
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Basic Info Section */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Identificação do Produto
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Produto *
                  </label>
                  <input
                    id="product-name-input"
                    type="text"
                    required
                    placeholder="Ex: Parafuso Sextavado Aço Inox 1/4 x 2"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Código / SKU Interno
                  </label>
                  <input
                    id="product-code-input"
                    type="text"
                    placeholder="Ex: EST-001 (auto se vazio)"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Código de Barras / EAN
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="product-barcode-input"
                        type="text"
                        placeholder="Ex: 7891000100011"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                      />
                    </div>
                    <button
                      id="open-barcode-scanner-btn"
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      title="Escanear com Câmera"
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Categoria *
                  </label>
                  <input
                    id="product-category-input"
                    type="text"
                    required
                    list="category-suggestions"
                    placeholder="Selecione ou digite..."
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                  <datalist id="category-suggestions">
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Unidade de Medida *
                  </label>
                  <select
                    id="product-unit-select"
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value as ProductUnit })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quantities and Stock Controls */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Controle de Estoque
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {!isEditing && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Estoque Inicial ({formData.unit})
                    </label>
                    <input
                      id="product-initial-stock-input"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={formData.initialStock}
                      onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Gera registro automático de entrada
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Estoque Mínimo (Alerta) *
                  </label>
                  <input
                    id="product-min-stock-input"
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="5"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Avisa quando atingir este saldo
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Estoque Máximo (Opcional)
                  </label>
                  <input
                    id="product-max-stock-input"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="100"
                    value={formData.maxStock}
                    onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Evita excesso de compras
                  </span>
                </div>
              </div>
            </div>

            {/* Financials & Prices */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Valores & Margem de Lucro
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Preço de Custo Unitário (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      R$
                    </span>
                    <input
                      id="product-cost-price-input"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Preço de Venda / Saída (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      R$
                    </span>
                    <input
                      id="product-selling-price-input"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Real-time Profit Preview */}
              {sell > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-slate-600 dark:text-slate-300">
                      Lucro Bruto por Unidade:
                    </span>
                    <span
                      className={`font-semibold ${
                        profitValue >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      R$ {profitValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-blue-600" />
                    <span className="text-slate-600 dark:text-slate-300">Margem Comercial:</span>
                    <span
                      className={`font-semibold ${
                        profitMargin >= 0 ? 'text-blue-600' : 'text-red-600'
                      }`}
                    >
                      {profitMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Location & Supplier */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Fornecedor & Armazenamento
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fornecedor Principal
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="product-supplier-input"
                      type="text"
                      placeholder="Ex: Distribuidora Nacional Ltda"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Localização no Almoxarifado / Loja
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="product-location-input"
                      type="text"
                      placeholder="Ex: Corredor B - Prateleira 03"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Descrição Detalhada / Aplicação
                  </label>
                  <textarea
                    id="product-description-input"
                    rows={2}
                    placeholder="Informações técnicas, dimensões, compatibilidade ou observações..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                id="cancel-product-btn"
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                id="save-product-btn"
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting
                  ? 'Salvando...'
                  : isEditing
                  ? 'Salvar Alterações'
                  : 'Cadastrar Produto'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Barcode scanner camera overlay */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(scanned) => setFormData((prev) => ({ ...prev, barcode: scanned }))}
      />
    </>
  );
};
