import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Lock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  X,
  AlertCircle,
  Building,
  Mail,
  Tag,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { getUserRoleInfo, getInitials, formatDate } from '../lib/utils';

interface UsersManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserUpdated?: () => void;
}

export const UsersManagementModal: React.FC<UsersManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | UserRole>('ALL');

  // Form modal state (create or edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('ALMOXARIFE');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [active, setActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  // Status feedback
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete user confirmation
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Fetch users
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/users');
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenCreate = () => {
    setEditingUser(null);
    setName('');
    setUsername('');
    setEmail('');
    setRole('ALMOXARIFE');
    setDepartment('Almoxarifado');
    setPassword('');
    setActive(true);
    setFormError(null);
    setFormSuccess(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username);
    setEmail(user.email || '');
    setRole(user.role);
    setDepartment(user.department || '');
    setPassword(''); // leave empty unless changing
    setActive(user.active);
    setFormError(null);
    setFormSuccess(null);
    setIsFormOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!name.trim() || !username.trim()) {
      setFormError('Nome e Usuário são obrigatórios.');
      return;
    }

    if (!editingUser && (!password || password.length < 4)) {
      setFormError('Para novos cadastros, a senha deve ter no mínimo 4 dígitos.');
      return;
    }

    if (editingUser && password && password.length < 4) {
      setFormError('A nova senha deve ter no mínimo 4 dígitos.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim() || undefined,
        role,
        department: department.trim() || 'Manutenção',
        active,
      };

      if (password) {
        payload.password = password;
      }

      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar usuário');
      }

      setFormSuccess(editingUser ? 'Usuário atualizado com sucesso!' : 'Novo usuário cadastrado com sucesso!');
      await fetchUsers();
      if (onUserUpdated) onUserUpdated();

      setTimeout(() => {
        setIsFormOpen(false);
      }, 700);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar usuário');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir usuário');
      }
      setUserToDelete(null);
      await fetchUsers();
      if (onUserUpdated) onUserUpdated();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir usuário');
    }
  };

  const filteredUsers = users.filter((u) => {
    if (filterRole !== 'ALL' && u.role !== filterRole) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = u.name.toLowerCase().includes(term);
      const matchUser = u.username.toLowerCase().includes(term);
      const matchEmail = u.email?.toLowerCase().includes(term);
      const matchDept = u.department?.toLowerCase().includes(term);
      return matchName || matchUser || matchEmail || matchDept;
    }
    return true;
  });

  return (
    <div
      id="users-management-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Gerenciamento de Usuários & Acessos</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-semibold">
                  Admin
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadastre técnicos, almoxarifes e engenheiros com controle de senhas e perfis de permissão.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="add-user-btn"
              type="button"
              onClick={handleOpenCreate}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Usuário</span>
            </button>

            <button
              id="close-users-modal-btn"
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, usuário, e-mail ou setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          <div className="w-full sm:w-56">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 transition-all font-medium"
            >
              <option value="ALL">Todos os Perfis ({users.length})</option>
              <option value="ADMIN">👑 Administradores / Acesso Geral</option>
              <option value="CONSULTA">🔍 Somente Consulta</option>
              <option value="ALMOXARIFE">📦 Almoxarifes</option>
              <option value="PCM_ENG">📊 Eng. PCM / Planejamento</option>
              <option value="MECANICO">🔧 Mecânicos / Eletricistas</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs">Carregando usuários...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Nenhum usuário encontrado
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredUsers.map((user) => {
                const roleInfo = getUserRoleInfo(user.role);
                const isCurrent = currentUser?.id === user.id;

                return (
                  <div
                    key={user.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      user.active
                        ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-purple-400/50'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl ${
                              user.avatarColor || 'bg-slate-700'
                            } text-white font-bold text-xs flex items-center justify-center shadow-xs`}
                          >
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                {user.name}
                              </h4>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                              <span>@{user.username}</span>
                              {user.active ? (
                                <span className="text-[10px] text-emerald-600 font-sans flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Ativo
                                </span>
                              ) : (
                                <span className="text-[10px] text-red-500 font-sans flex items-center gap-0.5">
                                  <XCircle className="w-2.5 h-2.5" /> Inativo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${roleInfo.badgeBg} ${roleInfo.badgeColor} ${roleInfo.badgeBorder}`}
                        >
                          {roleInfo.label.split('/')[0]}
                        </span>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                        {user.email && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        )}
                        {user.department && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{user.department}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400">
                        {user.lastLogin
                          ? `Último acesso: ${formatDate(user.lastLogin)}`
                          : 'Nunca acessou'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(user)}
                          title="Editar Usuário / Trocar Senha"
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950 text-slate-600 dark:text-slate-300 hover:text-purple-600 transition-colors text-xs font-semibold flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setUserToDelete(user)}
                          title="Excluir Usuário"
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-950 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inner Modal: Create or Edit User */}
        {isFormOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-purple-600" />
                  <span>{editingUser ? `Editar: ${editingUser.name}` : 'Cadastrar Novo Usuário'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="p-5 space-y-3">
                {formError && (
                  <div className="p-2.5 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                {formSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos de Souza"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Usuário de Login *
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="carlos.mecanica"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 font-mono transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Perfil de Acesso
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 transition-all font-medium"
                    >
                      <option value="ADMIN">⚡ Acesso Geral / Administrador (Total)</option>
                      <option value="CONSULTA">🔍 Somente Consulta (Visualizador)</option>
                      <option value="ALMOXARIFE">📦 Almoxarife (Entradas / Saídas / Balanço)</option>
                      <option value="PCM_ENG">📊 Eng. PCM / Planejamento</option>
                      <option value="MECANICO">🔧 Mecânico / Eletricista</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      E-mail (Opcional)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="carlos@empresa.com"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Setor / Oficina
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Oficina Mecânica"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {editingUser ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha de Acesso *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingUser ? '•••••••• (não alterada)' : 'Mínimo 4 caracteres'}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Active checkbox */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <span>Usuário ativo (permite login no sistema)</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-3.5 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Salvando...' : editingUser ? 'Atualizar Dados' : 'Cadastrar Usuário'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {userToDelete && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-center gap-3 text-red-600">
                <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Excluir Usuário
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Tem certeza que deseja remover o usuário <strong>{userToDelete.name}</strong> (@{userToDelete.username})? O acesso será revogado imediatamente.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
