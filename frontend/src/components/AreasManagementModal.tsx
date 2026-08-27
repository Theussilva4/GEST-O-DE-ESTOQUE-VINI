import React, { useState } from 'react';
import {
  X,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Droplets,
  Wrench,
  Building,
  Save,
  RotateCcw,
} from 'lucide-react';
import { OperationalArea, OperationalAreaType, User } from '../types';

interface AreasManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  areas: OperationalArea[];
  currentUser: User | null;
  onAreasUpdated: (areas: OperationalArea[]) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AREA_TYPE_CONFIG: Record<
  OperationalAreaType,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  SETOR: {
    label: 'Setor / Departamento',
    bg: 'bg-blue-50 dark:bg-blue-950/60',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    icon: '🏢',
  },
  LINHA: {
    label: 'Linha de Produção / Máquina',
    bg: 'bg-indigo-50 dark:bg-indigo-950/60',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    icon: '⚙️',
  },
  GALPAO: {
    label: 'Galpão / Pavilhão / Armazém',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: '📦',
  },
  UNIDADE: {
    label: 'Unidade / Filial / Planta',
    bg: 'bg-purple-50 dark:bg-purple-950/60',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    icon: '🏭',
  },
  ESTACAO: {
    label: 'Estação / Usina / Instalação',
    bg: 'bg-cyan-50 dark:bg-cyan-950/60',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800',
    icon: '⚡',
  },
  OFICINA: {
    label: 'Oficina / Manutenção',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    icon: '🛠️',
  },
  ETA: {
    label: 'Tratamento de Água / Efluentes',
    bg: 'bg-sky-50 dark:bg-sky-950/60',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    icon: '💧',
  },
  ETE: {
    label: 'Tratamento de Esgoto / Resíduos',
    bg: 'bg-teal-50 dark:bg-teal-950/60',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
    icon: '🧪',
  },
  POCO: {
    label: 'Poço / Captação',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: '🚰',
  },
  OUTROS: {
    label: 'Outro Local Operacional',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    icon: '📍',
  },
};

export const AreasManagementModal: React.FC<AreasManagementModalProps> = ({
  isOpen,
  onClose,
  areas,
  currentUser,
  onAreasUpdated,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');

  // Form State (New or Edit)
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<OperationalAreaType>('SETOR');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setType('SETOR');
    setCode('');
    setDescription('');
    setErrorMessage('');
  };

  const handleStartEdit = (area: OperationalArea) => {
    setIsEditing(true);
    setEditingId(area.id);
    setName(area.name);
    setType(area.type || 'OUTROS');
    setCode(area.code || '');
    setDescription(area.description || '');
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Informe o nome do local ou estação.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (isEditing && editingId) {
        // Update Area
        const res = await fetch(`/api/areas/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim().toUpperCase(),
            type,
            code: code.trim().toUpperCase() || undefined,
            description: description.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao atualizar local operacional.');

        onAreasUpdated(data.areas);
        showToast(`Local "${name.trim().toUpperCase()}" atualizado com sucesso!`, 'success');
        resetForm();
      } else {
        // Create Area
        const res = await fetch('/api/areas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim().toUpperCase(),
            type,
            code: code.trim().toUpperCase() || undefined,
            description: description.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar local operacional.');

        onAreasUpdated(data.areas);
        showToast(`Local "${name.trim().toUpperCase()}" cadastrado com sucesso!`, 'success');
        resetForm();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao salvar dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, areaName: string) => {
    try {
      const res = await fetch(`/api/areas/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao remover local.');

      onAreasUpdated(data.areas);
      showToast(`Local "${areaName}" excluído com sucesso.`, 'info');
      setDeleteConfirmId(null);
      if (editingId === id) resetForm();
    } catch (err: any) {
      showToast(err.message || 'Falha ao excluir local.', 'error');
    }
  };

  const filteredAreas = areas.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.code && a.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.description && a.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedTypeFilter === 'ALL' || a.type === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div
      id="areas-management-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Cadastro de Áreas & Locais Operacionais</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-500 text-slate-950 font-bold">
                  {areas.length} Locais
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Cadastre e gerencie setores, linhas de produção, galpões, unidades ou instalações operacionais
              </p>
            </div>
          </div>

          <button
            id="close-areas-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split 2 Columns on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto grow">
          {/* Left Column: Form (Create / Edit) */}
          <div className="lg:col-span-5 p-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                {isEditing ? (
                  <>
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                    Editar Local Operacional
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    Novo Local / Setor / Linha
                  </>
                )}
              </h3>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  Cancelar
                </button>
              )}
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Local / Setor / Unidade *
                </label>
                <input
                  id="area-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Linha de Produção 01, Galpão A, Almoxarifado Central..."
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Exemplos: Setor de Montagem, Linha 02, Oficina Mecânica, Galpão Norte, Caldeira Principal
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Tipo de Instalação
                  </label>
                  <select
                    id="area-type-select"
                    value={type}
                    onChange={(e) => setType(e.target.value as OperationalAreaType)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                  >
                    <option value="SETOR">🏢 Setor / Departamento</option>
                    <option value="LINHA">⚙️ Linha de Produção / Máquina</option>
                    <option value="GALPAO">📦 Galpão / Armazém</option>
                    <option value="UNIDADE">🏭 Unidade / Filial</option>
                    <option value="ESTACAO">⚡ Estação / Usina</option>
                    <option value="OFICINA">🛠️ Oficina / Manutenção</option>
                    <option value="ETA">💧 Tratamento de Água / Efluentes</option>
                    <option value="ETE">🧪 Tratamento de Esgoto / Resíduos</option>
                    <option value="POCO">🚰 Poço / Captação</option>
                    <option value="OUTROS">📍 Outro Local Operacional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Sigla / Código (Opcional)
                  </label>
                  <input
                    id="area-code-input"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ex: LIN-01, GALP-A, OFI-01"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono uppercase text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Descrição / Detalhes de Localização
                </label>
                <textarea
                  id="area-desc-input"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informações adicionais, ponto de referência ou máquinas do local..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  id="save-area-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? 'Atualizar Local' : 'Salvar Local Operacional'}</span>
                </button>
              </div>
            </form>

            {/* Quick Helper Tips */}
            <div className="mt-5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Vínculo Automático com Ordens de Serviço
              </div>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                Todos os locais cadastrados aqui ficarão disponíveis na emissão de O.S., nas saídas de peças e nos relatórios de custos por unidade de operação.
              </p>
            </div>
          </div>

          {/* Right Column: Registered Areas List */}
          <div className="lg:col-span-7 p-5 space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative grow">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar local (ex: Linha 01, Galpão A, Oficina)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">Todos os Tipos ({areas.length})</option>
                <option value="SETOR">Setor / Depto</option>
                <option value="LINHA">Linha / Máquina</option>
                <option value="GALPAO">Galpão / Armazém</option>
                <option value="UNIDADE">Unidade / Planta</option>
                <option value="ESTACAO">Estação / Usina</option>
                <option value="OFICINA">Oficina</option>
                <option value="ETA">Tratamento Água</option>
                <option value="ETE">Tratamento Esgoto</option>
                <option value="POCO">Poço</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredAreas.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <MapPin className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Nenhum local cadastrado
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Utilize o formulário ao lado para cadastrar suas áreas, linhas de produção ou setores.
                  </p>
                </div>
              ) : (
                filteredAreas.map((area) => {
                  const cfg = AREA_TYPE_CONFIG[area.type || 'OUTROS'] || AREA_TYPE_CONFIG.OUTROS;
                  const isSelected = editingId === area.id;

                  return (
                    <div
                      key={area.id}
                      className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="space-y-1 grow min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {area.name}
                          </span>
                          {area.code && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {area.code}
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                          >
                            <span>{cfg.icon}</span>
                            <span>{cfg.label}</span>
                          </span>
                        </div>

                        {area.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">
                            {area.description}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(area)}
                          title="Editar Local"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {deleteConfirmId === area.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950 p-1 rounded-lg border border-rose-200 dark:border-rose-800">
                            <span className="text-[10px] text-rose-700 dark:text-rose-300 font-bold px-1">
                              Excluir?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(area.id, area.name)}
                              className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px]"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(area.id)}
                            title="Excluir Local"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            {areas.length} áreas/estações cadastradas e prontas para uso em O.S.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
