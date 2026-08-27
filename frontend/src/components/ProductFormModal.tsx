import React, { useState, useEffect, useRef } from 'react';
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
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Link,
  Cpu,
  ShieldAlert,
  Flame,
  Tag,
  Wrench,
} from 'lucide-react';
import { Produto, UnidadeProduto, CriticidadeManutencao } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: any) => Promise<void>;
  productToEdit?: Produto | null;
  existingCategories: string[];
}

const COMMON_UNITS: { value: UnidadeProduto; label: string }[] = [
  { value: 'UN', label: 'Unidade (UN)' },
  { value: 'PAR', label: 'Par (PAR)' },
  { value: 'KIT', label: 'Kit / Conjunto (KIT)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'KG', label: 'Quilograma (KG)' },
  { value: 'M', label: 'Metro (M)' },
  { value: 'CX', label: 'Caixa (CX)' },
  { value: 'PCT', label: 'Pacote (PCT)' },
  { value: 'ROLO', label: 'Rolo (ROLO)' },
];

const SUGGESTED_MAINTENANCE_CATEGORIES = [
  'Rolamentos & Mancais',
  'Pneumática',
  'Hidráulica',
  'Elétrica & Painéis',
  'Motores & Redutores',
  'Lubrificantes & Químicos',
  'Correias & Polias',
  'Vedações & Retentores',
  'Fixação & Parafusos',
  'Ferramentas & Desgaste',
  'Sensores & Automação',
  'EPI & Segurança Industrial',
  'Bombas & Válvulas',
  'Filtros & Elementos Filtrantes',
  'Outros Sobressalentes',
];

// Helper to compress images client-side into lightweight base64
async function compressImageFile(file: File, maxWidth = 800, maxHeight = 800, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

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
    url_imagem: '',
    codcategoria: '',
    unidade_medida: 'UN' as UnidadeProduto,
    tag_equipamento: '',
    criticidade: 'LOW' as CriticidadeManutencao,
    initialStock: '0',
    estoque_minimo: '2',
    estoque_maximo: '',
    preco_custo: '',
    preco_venda: '',
    codfornecedor: '',
    localizacao_estoque: '',
    codusuario: 'Almoxarife / PCM',
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state on open / edit
  useEffect(() => {
    if (productToEdit) {
      setFormData({
        code: productToEdit.code,
        barcode: productToEdit.barcode || '',
        name: productToEdit.name,
        description: productToEdit.description || '',
        url_imagem: productToEdit.url_imagem || '',
        codcategoria: productToEdit.codcategoria,
        unidade_medida: productToEdit.unidade_medida,
        tag_equipamento: productToEdit.tag_equipamento || '',
        criticidade: productToEdit.criticidade || 'LOW',
        initialStock: String(productToEdit.estoque_atual),
        estoque_minimo: String(productToEdit.estoque_minimo),
        estoque_maximo: productToEdit.estoque_maximo ? String(productToEdit.estoque_maximo) : '',
        preco_custo: String(productToEdit.preco_custo || ''),
        preco_venda: String(productToEdit.preco_venda || productToEdit.preco_custo || ''),
        codfornecedor: productToEdit.codfornecedor || '',
        localizacao_estoque: productToEdit.localizacao_estoque || '',
        codusuario: 'Almoxarife / PCM',
      });
      setShowUrlInput(Boolean(productToEdit.url_imagem && productToEdit.url_imagem.startsWith('http')));
    } else {
      setFormData({
        code: '',
        barcode: '',
        name: '',
        description: '',
        url_imagem: '',
        codcategoria: '',
        unidade_medida: 'UN',
        tag_equipamento: '',
        criticidade: 'LOW',
        initialStock: '0',
        estoque_minimo: '2',
        estoque_maximo: '',
        preco_custo: '',
        preco_venda: '',
        codfornecedor: '',
        localizacao_estoque: '',
        codusuario: 'Almoxarife / PCM',
      });
      setShowUrlInput(false);
    }
    setErrorMsg(null);
  }, [productToEdit, isOpen]);

  const allCategories = Array.from(
    new Set([...SUGGESTED_MAINTENANCE_CATEGORIES, ...existingCategories])
  ).filter(Boolean);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }

    try {
      setIsUploadingImage(true);
      setErrorMsg(null);
      const base64 = await compressImageFile(file, 800, 800, 0.82);
      setFormData((prev) => ({ ...prev, url_imagem: base64 }));
    } catch (err) {
      console.error('Error compressing image:', err);
      setErrorMsg('Falha ao processar imagem.');
    } finally {
      setIsUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, url_imagem: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('A descrição / nome do sobressalente é obrigatório.');
      return;
    }
    if (!formData.codcategoria.trim()) {
      setErrorMsg('A categoria de manutenção é obrigatória.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const unitCost = parseFloat(formData.preco_custo) || 0;
      await onSave({
        ...formData,
        url_imagem: formData.url_imagem.trim() || undefined,
        tag_equipamento: formData.tag_equipamento.trim() || undefined,
        criticidade: formData.criticidade,
        initialStock: parseFloat(formData.initialStock) || 0,
        estoque_minimo: parseFloat(formData.estoque_minimo) || 0,
        estoque_maximo: formData.estoque_maximo ? parseFloat(formData.estoque_maximo) : undefined,
        preco_custo: unitCost,
        preco_venda: formData.preco_venda ? parseFloat(formData.preco_venda) : unitCost,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao salvar o item de manutenção.');
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
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{isEditing ? 'Editar Peça / Sobressalente' : 'Cadastrar Item de Manutenção'}</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                    Almoxarifado MRO
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isEditing
                    ? 'Atualize foto, código de barras, TAGs de máquina e dados do estoque'
                    : 'Cadastre sobressalentes, ferramentas, EPIs ou peças de reposição'}
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

            {/* PRODUCT PHOTO ATTACHMENT SECTION */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" /> Foto da Peça / Imagem Anexa
              </h3>

              {/* Hidden file inputs for Camera and Gallery */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFileChange}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageFileChange}
              />

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                {/* Photo Preview Box */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group">
                  {formData.url_imagem ? (
                    <>
                      <img
                        src={formData.url_imagem}
                        alt="Foto da peça"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        title="Remover foto"
                        className="absolute top-1 right-1 p-1 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-md transition-opacity opacity-90 hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                      <span className="text-[10px] text-slate-400 block font-medium">Sem foto</span>
                    </div>
                  )}

                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Upload Action Buttons */}
                <div className="flex-1 space-y-2 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Take photo directly with phone camera */}
                    <button
                      id="take-product-photo-btn"
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Tirar Foto (Câmera)</span>
                    </button>

                    {/* Choose from gallery / file */}
                    <button
                      id="upload-product-photo-btn"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Galeria / Arquivo</span>
                    </button>

                    {/* URL toggle */}
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="px-3 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Link className="w-3.5 h-3.5" />
                      <span>Inserir URL</span>
                    </button>
                  </div>

                  {showUrlInput && (
                    <div className="pt-1">
                      <input
                        type="url"
                        placeholder="https://exemplo.com/foto-peca.jpg"
                        value={formData.url_imagem}
                        onChange={(e) => setFormData({ ...formData, url_imagem: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    Anexe a foto da peça ou placa técnica para agilizar identificação no almoxarifado pelos mecânicos e eletricistas.
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Info Section */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" /> Identificação do Sobressalente
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Descrição do Sobressalente / Peça *
                  </label>
                  <input
                    id="product-name-input"
                    type="text"
                    required
                    placeholder="Ex: Rolamento Autocompensador 22216 EK ou Válvula 5/2 24VCC"
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
                    placeholder="Ex: MNT-001 (auto se vazio)"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Código de Barras / EAN / QR Code
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="product-barcode-input"
                        type="text"
                        placeholder="Ex: 7891000100011 ou bip manual"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                      />
                    </div>
                    <button
                      id="open-barcode-scanner-btn"
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      title="Escanear Código de Barras com Câmera do Celular"
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
                    >
                      <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Categoria de Manutenção *
                  </label>
                  <input
                    id="product-codcategoria-input"
                    type="text"
                    required
                    list="maintenance-codcategoria-suggestions"
                    placeholder="Selecione ou digite..."
                    value={formData.codcategoria}
                    onChange={(e) => setFormData({ ...formData, codcategoria: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                  <datalist id="maintenance-codcategoria-suggestions">
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
                    id="product-unidade_medida-select"
                    value={formData.unidade_medida}
                    onChange={(e) =>
                      setFormData({ ...formData, unidade_medida: e.target.value as UnidadeProduto })
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

            {/* Maintenance Specific: Equipment TAG & Criticality */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-emerald-600" /> Aplicação em Máquinas & Criticidade
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    TAG(s) / Equipamento(s) de Destino
                  </label>
                  <div className="relative">
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="product-equipment-tag-input"
                      type="text"
                      placeholder="Ex: PRE-HY-02 / RED-04 / Linha 01"
                      value={formData.tag_equipamento}
                      onChange={(e) => setFormData({ ...formData, tag_equipamento: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Ajuda o técnico a localizar o sobressalente por TAG de máquina.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Criticidade da Peça na Planta *
                  </label>
                  <select
                    id="product-criticidade-select"
                    value={formData.criticidade}
                    onChange={(e) =>
                      setFormData({ ...formData, criticidade: e.target.value as CriticidadeManutencao })
                    }
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  >
                    <option value="HIGH">🔴 Alta (Crítica A - Causa Parada de Fábrica)</option>
                    <option value="MEDIUM">🟡 Média (Importante B - Impacto Parcial)</option>
                    <option value="LOW">⚪ Baixa (Geral C - Consumo / Sem Parada)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Peças críticas geram alertas prioritários de reposição no almoxarifado.
                  </span>
                </div>
              </div>
            </div>

            {/* Quantities and Stock Controls */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" /> Níveis de Estoque de Segurança
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {!isEditing && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Estoque Físico Inicial ({formData.unidade_medida})
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
                      Gera registro inicial automático
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Ponto de Reposição / Mínimo *
                  </label>
                  <input
                    id="product-min-stock-input"
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="2"
                    value={formData.estoque_minimo}
                    onChange={(e) => setFormData({ ...formData, estoque_minimo: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all font-semibold"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Gera alerta quando atingir este saldo
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Estoque Máximo / Teto
                  </label>
                  <input
                    id="product-max-stock-input"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="10"
                    value={formData.estoque_maximo}
                    onChange={(e) => setFormData({ ...formData, estoque_maximo: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Evita imobilizado desnecessário
                  </span>
                </div>
              </div>
            </div>

            {/* Financial / Cost Valuation */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Custo Unitário de Aquisição
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Custo Médio Unitário (R$)
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
                      value={formData.preco_custo}
                      onChange={(e) => setFormData({ ...formData, preco_custo: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Valor base para cálculo do patrimônio e custo das ordens de serviço.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fabricante / Marca / Fornecedor
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="product-codfornecedor-input"
                      type="text"
                      placeholder="Ex: SKF, Festo, Siemens, Mobil, WEG"
                      value={formData.codfornecedor}
                      onChange={(e) => setFormData({ ...formData, codfornecedor: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Location & Details */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Endereçamento no Almoxarifado
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Localização Física (Prateleira / Gaveteiro / Armário)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="product-localizacao_estoque-input"
                      type="text"
                      placeholder="Ex: Prateleira B-04 / Gaveteiro M-02 / Bacia de Contenção Q-01"
                      value={formData.localizacao_estoque}
                      onChange={(e) => setFormData({ ...formData, localizacao_estoque: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Especificações Técnicas / Observações da Aplicação
                  </label>
                  <textarea
                    id="product-description-input"
                    rows={2}
                    placeholder="Dimensões, voltagem, tolerâncias, especificações do fabricante ou instruções de montagem..."
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
                  : 'Cadastrar Sobressalente'}
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
