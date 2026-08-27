import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Trash2,
  AlertTriangle,
  Package,
  Boxes,
  Layers,
  DollarSign,
  Download,
  Printer,
  Barcode,
  Camera,
  MapPin,
  XCircle,
  LayoutGrid,
  List,
  ClipboardList,
  Wrench,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import { Produto, Movimentacao, CriticidadeManutencao } from '../types';
import { formatCurrency, formatNumber, getStockStatus, getCriticalityInfo, exportToCSV } from '../lib/utils';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { generateInventoryReportPDF } from '../lib/pdfGenerator';

interface InventoryViewProps {
  products: Produto[];
  movements: Movimentacao[];
  onNewProduct: () => void;
  onEditProduct: (product: Produto) => void;
  onDeleteProduct: (codproduto: string) => Promise<void>;
  onNewEntry: (product?: Produto) => void;
  onNewExit: (product?: Produto) => void;
  onOpenAudit: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  movements,
  onNewProduct,
  onEditProduct,
  onDeleteProduct,
  onNewEntry,
  onNewExit,
  onOpenAudit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedCriticality, setSelectedCriticality] = useState<'ALL' | CriticidadeManutencao>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'low' | 'out' | 'normal'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'value' | 'code' | 'criticidade'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Produto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string; code: string } | null>(null);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.codcategoria) set.add(p.codcategoria);
    });
    return Array.from(set).sort();
  }, [products]);

  // Overall KPIs for Maintenance
  const stats = useMemo(() => {
    let totalItems = 0;
    let totalCost = 0;
    let lowCount = 0;
    let outCount = 0;
    let highCriticalityCount = 0;

    products.forEach((p) => {
      totalItems += p.estoque_atual;
      totalCost += p.estoque_atual * p.preco_custo;
      if (p.criticidade === 'HIGH') {
        highCriticalityCount++;
      }
      if (p.estoque_atual <= 0) {
        outCount++;
      } else if (p.estoque_atual <= p.estoque_minimo) {
        lowCount++;
      }
    });

    return {
      totalProducts: products.length,
      totalItems,
      totalCost,
      highCriticalityCount,
      lowCount,
      outCount,
      alertCount: lowCount + outCount,
    };
  }, [products]);

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        // Category filter
        if (selectedCategory !== 'ALL' && product.codcategoria !== selectedCategory) {
          return false;
        }

        // Criticality filter
        if (selectedCriticality !== 'ALL' && product.criticidade !== selectedCriticality) {
          return false;
        }

        // Status filter
        const statusInfo = getStockStatus(product);
        if (selectedStatus === 'out' && statusInfo.status !== 'out') return false;
        if (selectedStatus === 'low' && statusInfo.status !== 'low') return false;
        if (selectedStatus === 'normal' && statusInfo.status !== 'normal') return false;

        // Search text
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchesName = product.name.toLowerCase().includes(term);
          const matchesCode = product.code.toLowerCase().includes(term);
          const matchesBarcode = product.barcode?.toLowerCase().includes(term);
          const matchesTag = product.tag_equipamento?.toLowerCase().includes(term);
          const matchesCategory = product.codcategoria.toLowerCase().includes(term);
          const matchesSupplier = product.codfornecedor?.toLowerCase().includes(term);
          const matchesLocation = product.localizacao_estoque?.toLowerCase().includes(term);
          return (
            matchesName ||
            matchesCode ||
            matchesBarcode ||
            matchesTag ||
            matchesCategory ||
            matchesSupplier ||
            matchesLocation
          );
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'name') {
          diff = a.name.localeCompare(b.name);
        } else if (sortBy === 'stock') {
          diff = a.estoque_atual - b.estoque_atual;
        } else if (sortBy === 'value') {
          diff = a.estoque_atual * a.preco_custo - b.estoque_atual * b.preco_custo;
        } else if (sortBy === 'code') {
          diff = a.code.localeCompare(b.code);
        } else if (sortBy === 'criticidade') {
          const critScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          diff = (critScore[b.criticidade || 'LOW'] || 0) - (critScore[a.criticidade || 'LOW'] || 0);
        }
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [products, searchTerm, selectedCategory, selectedCriticality, selectedStatus, sortBy, sortOrder]);

  const handleExportCSV = () => {
    const rows = filteredProducts.map((p) => {
      const status = getStockStatus(p);
      const crit = getCriticalityInfo(p.criticidade);
      return {
        Código: p.code,
        'Código de Barras': p.barcode || '',
        'Peça / Sobressalente': p.name,
        'TAG Equipamento': p.tag_equipamento || '',
        Criticidade: crit.label,
        Categoria: p.codcategoria,
        Unidade: p.unidade_medida,
        'Estoque Atual': p.estoque_atual,
        'Ponto de Reposição (Mín)': p.estoque_minimo,
        'Estoque Máximo': p.estoque_maximo || '',
        Status: status.label,
        'Custo Unitário (R$)': p.preco_custo.toFixed(2),
        'Valor Total em Estoque (R$)': (p.estoque_atual * p.preco_custo).toFixed(2),
        'Fabricante / Fornecedor': p.codfornecedor || '',
        'Localização Almoxarifado': p.localizacao_estoque || '',
      };
    });
    exportToCSV(`Almoxarifado_Manutencao_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const handlePrint = () => {
    try {
      generateInventoryReportPDF(filteredProducts);
    } catch (err) {
      console.error('Error generating PDF report:', err);
      window.print();
    }
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteProduct(productToDelete.id);
      setProductToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>Controle de Estoque PRO</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gestão de peças, bombas, conexões, TAGs operacionais e sobressalentes para sistemas de saneamento e água.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="audit-button"
            type="button"
            onClick={onOpenAudit}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
            title="Realizar balanço físico de gavetas e prateleiras"
          >
            <ClipboardList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Balanço /</span> Inventário Físico
          </button>

          <button
            id="quick-entry-btn"
            type="button"
            onClick={() => onNewEntry()}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 transition-colors shadow-sm"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Entrada (Compra / NF)</span>
          </button>

          <button
            id="quick-exit-btn"
            type="button"
            onClick={() => onNewExit()}
            className="px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5 border border-amber-200 dark:border-amber-800 transition-colors shadow-sm"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>- Baixa em O.S.</span>
          </button>

          <button
            id="new-product-top-btn"
            type="button"
            onClick={onNewProduct}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Sobressalente</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total SKUs & Items */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Sobressalentes Cadastrados
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {formatNumber(stats.totalItems)} <span className="text-xs font-normal text-slate-400">peças</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {stats.totalProducts} códigos / SKUs no almoxarifado
            </div>
          </div>
        </div>

        {/* Card 2: Valor Total Custo */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Patrimônio Imobilizado em Peças
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {formatCurrency(stats.totalCost)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Valor em estoque de reposição
            </div>
          </div>
        </div>

        {/* Card 3: Peças Críticas A */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Itens Críticos (Classe A)
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              {stats.highCriticalityCount} itens
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Peças vitais que causam interrupção no abastecimento ou tratamento
            </div>
          </div>
        </div>

        {/* Card 4: Alertas de Reposição */}
        <div
          className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition-colors ${
            stats.alertCount > 0
              ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/80'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Ponto de Reposição / Zerados
            </span>
            <div
              className={`p-2 rounded-xl ${
                stats.alertCount > 0
                  ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span>{stats.alertCount} itens</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {stats.outCount} sem estoque | {stats.lowCount} abaixo do mínimo
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="inventory-search-input"
              type="text"
              placeholder="Buscar por descrição, código SKU, código de barras, TAG operacional, estação ou localização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold p-1"
              >
                Limpar
              </button>
            ) : (
              <button
                id="inventory-search-scan-btn"
                type="button"
                onClick={() => setIsScannerOpen(true)}
                title="Escanear Código de Barras"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Select */}
          <div className="w-full md:w-48">
            <select
              id="inventory-codcategoria-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              <option value="ALL">Todas Categorias ({products.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Criticality Filter */}
          <div className="w-full md:w-44">
            <select
              id="inventory-criticidade-filter"
              value={selectedCriticality}
              onChange={(e) => setSelectedCriticality(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              <option value="ALL">Todas Criticidades</option>
              <option value="HIGH">🔴 Alta (Crítica A)</option>
              <option value="MEDIUM">🟡 Média (Importante B)</option>
              <option value="LOW">⚪ Baixa (Geral C)</option>
            </select>
          </div>

          {/* Status Quick Filter */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 overflow-x-auto">
            <button
              id="filter-status-all"
              type="button"
              onClick={() => setSelectedStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                selectedStatus === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              id="filter-status-low"
              type="button"
              onClick={() => setSelectedStatus('low')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1 ${
                selectedStatus === 'low'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              Reposição ({stats.lowCount})
            </button>
            <button
              id="filter-status-out"
              type="button"
              onClick={() => setSelectedStatus('out')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1 ${
                selectedStatus === 'out'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              Zerado ({stats.outCount})
            </button>
          </div>

          {/* View Mode & Export Tools */}
          <div className="flex items-center gap-2 justify-end">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Visualização em Tabela"
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-400'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                title="Visualização em Cards"
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-400'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <button
              id="export-csv-btn"
              type="button"
              onClick={handleExportCSV}
              title="Exportar inventário de sobressalentes para Excel / CSV"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              id="print-inventory-btn"
              type="button"
              onClick={handlePrint}
              title="Gerar e Imprimir Relatório de Almoxarifado em PDF"
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Relatório PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Products Display (Table or Cards) */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <Wrench className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Nenhum sobressalente encontrado
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || selectedCriticality !== 'ALL'
              ? 'Tente ajustar os filtros ou termo de busca para localizar as peças.'
              : 'Comece adicionando seus sobressalentes de manutenção no botão abaixo.'}
          </p>
          <button
            type="button"
            onClick={onNewProduct}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Cadastrar Sobressalente
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Foto</th>
                  <th className="py-3 px-4">Código / SKU</th>
                  <th className="py-3 px-4">Peça / Sobressalente</th>
                  <th className="py-3 px-4">TAG Equipamento</th>
                  <th className="py-3 px-4 text-center">Criticidade</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-center">Saldo Físico</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Custo Unit.</th>
                  <th className="py-3 px-4 text-right">Total em Estoque</th>
                  <th className="py-3 px-4 text-center">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product);
                  const crit = getCriticalityInfo(product.criticidade);
                  const totalCost = product.estoque_atual * product.preco_custo;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Photo Thumbnail */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {product.url_imagem ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage({
                                url: product.url_imagem!,
                                name: product.name,
                                code: product.code,
                              })
                            }
                            title="Clique para ampliar foto"
                            className="relative w-11 h-11 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white group/img shadow-xs hover:ring-2 hover:ring-emerald-500 transition-all block"
                          >
                            <img
                              src={product.url_imagem}
                              alt={product.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                            />
                          </button>
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-400">
                            <Wrench className="w-5 h-5 opacity-60" />
                          </div>
                        )}
                      </td>

                      {/* Code & Barcode */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        <div>{product.code}</div>
                        {product.barcode && (
                          <div className="text-[10px] font-normal text-slate-400 flex items-center gap-1">
                            <Barcode className="w-3 h-3" /> {product.barcode}
                          </div>
                        )}
                      </td>

                      {/* Name & Location */}
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 leading-snug break-words whitespace-normal">
                          {product.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 leading-normal whitespace-normal break-words">
                          {product.localizacao_estoque ? (
                            <span className="inline-flex items-center gap-1 shrink-0">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {product.localizacao_estoque}
                            </span>
                          ) : null}
                          {product.codfornecedor ? (
                            <span className="text-slate-500 dark:text-slate-400 break-words whitespace-normal">
                              {product.localizacao_estoque ? '• ' : ''}{product.codfornecedor}
                            </span>
                          ) : null}
                          {product.description && (
                            <span className="text-slate-400 dark:text-slate-500 text-[10px] w-full block mt-0.5 break-words whitespace-normal">
                              {product.description}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Equipment TAG */}
                      <td className="py-3.5 px-4 min-w-[120px]">
                        {product.tag_equipamento ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-medium border border-emerald-200/60 dark:border-emerald-800/60 break-words">
                            <Tag className="w-3 h-3 shrink-0" />
                            <span>{product.tag_equipamento}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Uso Geral</span>
                        )}
                      </td>

                      {/* Criticality */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border leading-tight text-center ${crit.bg} ${crit.color} ${crit.border}`}
                        >
                          {crit.label}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                          {product.codcategoria}
                        </span>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="font-black text-sm text-slate-900 dark:text-slate-100">
                          {formatNumber(product.estoque_atual)}{' '}
                          <span className="text-[10px] font-semibold text-slate-400">
                            {product.unidade_medida}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Mín: {product.estoque_minimo} {product.unidade_medida}
                        </div>
                      </td>

                      {/* Status Tag */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.bg} ${status.color} ${status.border}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      {/* Unit Cost */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                        {formatCurrency(product.preco_custo)}
                      </td>

                      {/* Total Cost Value */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(totalCost)}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            id={`row-entry-${product.id}`}
                            type="button"
                            onClick={() => onNewEntry(product)}
                            title="Lançar Entrada (+)"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900 dark:text-emerald-300 transition-colors"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`row-exit-${product.id}`}
                            type="button"
                            onClick={() => onNewExit(product)}
                            title="Baixa em O.S. (-)"
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:hover:bg-amber-900 dark:text-amber-300 transition-colors"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`row-edit-${product.id}`}
                            type="button"
                            onClick={() => onEditProduct(product)}
                            title="Editar Sobressalente"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`row-delete-${product.id}`}
                            type="button"
                            onClick={() => setProductToDelete(product)}
                            title="Excluir Sobressalente"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Mobile / Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
          {filteredProducts.map((product) => {
            const status = getStockStatus(product);
            const crit = getCriticalityInfo(product.criticidade);
            const totalCost = product.estoque_atual * product.preco_custo;

            return (
              <div
                key={product.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3 hover:border-emerald-500/50 transition-all overflow-hidden"
              >
                <div>
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    {product.url_imagem ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewImage({
                            url: product.url_imagem!,
                            name: product.name,
                            code: product.code,
                          })
                        }
                        title="Ver foto ampliada"
                        className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white shrink-0 shadow-inner group/cardimg relative"
                      >
                        <img
                          src={product.url_imagem}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover/cardimg:scale-105 transition-transform duration-200"
                        />
                      </button>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-400 shrink-0">
                        <Wrench className="w-6 h-6 opacity-60" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {product.code}
                        </span>
                        <div className="flex items-center gap-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${crit.bg} ${crit.color} ${crit.border}`}
                          >
                            {crit.label.split(' ')[0]}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${status.bg} ${status.color} ${status.border}`}
                          >
                            {status.label}
                          </span>
                        </div>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 break-words whitespace-normal leading-snug mt-0.5">
                        {product.name}
                      </h3>
                      {product.barcode && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono mt-0.5 break-words">
                          <Barcode className="w-3 h-3 shrink-0" /> {product.barcode}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400 whitespace-normal">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium">
                      {product.codcategoria}
                    </span>
                    {product.tag_equipamento && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-medium flex items-center gap-1 break-words">
                        <Tag className="w-3 h-3 shrink-0" /> {product.tag_equipamento}
                      </span>
                    )}
                    {product.localizacao_estoque && (
                      <span className="flex items-center gap-1 text-[11px] break-words">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {product.localizacao_estoque}
                      </span>
                    )}
                    {product.codfornecedor && (
                      <span className="text-[11px] text-slate-400 break-words whitespace-normal">
                        • {product.codfornecedor}
                      </span>
                    )}
                  </div>
                </div>

                {/* Numbers Box */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Saldo Físico</span>
                    <span className="text-base font-black text-slate-900 dark:text-slate-100">
                      {product.estoque_atual}{' '}
                      <span className="text-xs font-normal text-slate-400">{product.unidade_medida}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Mínimo: {product.estoque_minimo} {product.unidade_medida}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Custo Unitário</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(product.preco_custo)}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
                      Total: {formatCurrency(totalCost)}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onNewEntry(product)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" /> + Entrada
                    </button>
                    <button
                      type="button"
                      onClick={() => onNewExit(product)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" /> - Baixa O.S.
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditProduct(product)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductToDelete(product)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Produto Image Lightbox Modal */}
      {previewImage && (
        <div
          id="product-image-lightbox"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {previewImage.name}
                </h3>
                <p className="text-[11px] font-mono text-slate-400">{previewImage.code}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-950">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                referrerPolicy="no-referrer"
                className="max-h-[60vh] max-w-full rounded-2xl object-contain shadow-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Excluir Sobressalente
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Tem certeza de que deseja remover o item{' '}
              <strong>"{productToDelete.name}"</strong> ([{productToDelete.code}]) do almoxarifado? O saldo físico atual é{' '}
              <strong>{productToDelete.estoque_atual} {productToDelete.unidade_medida}</strong>.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
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
                {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode scanner */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(scanned) => setSearchTerm(scanned)}
        title="Buscar Sobressalente por Código de Barras"
      />
    </div>
  );
};
