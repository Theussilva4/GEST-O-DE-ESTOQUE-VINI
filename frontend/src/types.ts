export type MovementType = 'IN' | 'OUT' | 'ADJUST';

export type MaintenanceCriticality = 'HIGH' | 'MEDIUM' | 'LOW';

export type OperationalAreaType =
  | 'SETOR'
  | 'LINHA'
  | 'GALPAO'
  | 'UNIDADE'
  | 'ESTACAO'
  | 'OFICINA'
  | 'ETA'
  | 'ETE'
  | 'POCO'
  | 'OUTROS';

export interface OperationalArea {
  id: string;
  name: string; // Ex: 'Linha 01', 'Galpão A', 'Oficina Central', 'Setor de Envase'
  type: OperationalAreaType;
  code?: string; // Ex: 'LIN-01', 'GALP-A', 'OFI-01'
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkOrderReturnItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  quantityReturned: number;
  returnedBy: string;
  reason?: string;
  timestamp: string;
}

export interface WorkOrderItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number; // Quantidade solicitada / liberada na Guia de O.S.
  dischargedQuantity?: number; // Quantidade efetivamente baixada / retirada do estoque
  returnedQuantity?: number; // Quantidade devolvida ao almoxarifado (sobra)
  unit: ProductUnit | string;
  unitPrice: number;
  totalPrice: number;
  currentStock: number;
}

export interface WorkOrder {
  id: string;
  osNumber: string; // Ex: OS-2026-0001
  date: string;
  serviceType: 'CORRETIVA' | 'PREVENTIVA' | 'PREDITIVA' | 'REFORMA' | 'EMERGENCIAL' | 'INSTALACAO' | 'OUTROS';
  application: string; // Aplicação / Equipamento / TAG
  equipmentTag?: string; // TAG da máquina
  operationalArea?: string; // Local / Área Operacional (Ex: Linha 01, Galpão A, Almoxarifado)
  requesterName: string; // Ex: Carlos Silva (Mecânico)
  requesterRole?: string; // Mecânico / Técnico
  authorizedBy: string; // Supervisor / Almoxarife que autorizou
  warehouseKeeper?: string; // Almoxarife que fez a entrega
  sector?: string; // Setor / Oficina
  priority: 'ALTA' | 'MEDIA' | 'BAIXA' | 'URGENTE';
  items: WorkOrderItem[];
  totalCost: number;
  totalQuantity: number;
  status: 'ABERTA' | 'PARCIAL' | 'CONCLUIDA' | 'CANCELADA'; // ABERTA = Materiais solicitados/liberados na Guia (aguardando baixa física)
  dischargedAt?: string; // Data da baixa
  dischargedBy?: string; // Responsável que realizou a baixa
  returns?: WorkOrderReturnItem[]; // Histórico de sobras devolvidas ao almoxarifado
  notes?: string;
  createdAt: string;
}

export type EntryReason = 
  | 'Recebimento de Compra / NF'
  | 'Compra / Reposição de Sobressalentes'
  | 'Devolução de Sobra de O.S.'
  | 'Peça Recondicionada / Recuperada'
  | 'Entrada por Fabricação Interna / Usinagem'
  | 'Retorno de Recuperação / Recondicionamento'
  | 'Transferência entre Almoxarifados'
  | 'Transferência de Outra Oficina / Almoxarifado'
  | 'Retorno de Empréstimo de Ferramenta'
  | 'Ajuste de Balanço / Inventário (+)'
  | 'Ajuste de Inventário (+)'
  | 'Outros';

export type ExitReason = 
  | 'Aplicação em O.S. Preventiva'
  | 'Aplicação em O.S. Corretiva'
  | 'Aplicação em O.S. Corretiva (Urgente)'
  | 'Aplicação em O.S. Preditiva'
  | 'Manutenção Preditiva / Rota de Inspeção'
  | 'Manutenção Predial & Utilidades'
  | 'Manutenção de Frotas & Veículos'
  | 'Aplicação em Reforma / Melhoria / Capex'
  | 'Uso e Consumo em Oficina'
  | 'Consumo Geral em Oficina'
  | 'Empréstimo de Ferramenta / Equipamento'
  | 'Avaria / Desgaste / Peça Danificada'
  | 'Envio para Recondicionamento Externo'
  | 'Descarte / Sucata / Danificado'
  | 'Envio para Garantia / Fabricante'
  | 'Transferência para Outra Oficina'
  | 'Ajuste de Balanço / Inventário (-)'
  | 'Ajuste de Inventário (-)'
  | 'Outros';

export type ProductUnit = 'UN' | 'KG' | 'L' | 'CX' | 'M' | 'PAR' | 'PCT' | 'ROLO' | 'JOGO' | 'KIT' | 'PECA';

export interface Product {
  id: string;
  code: string; // Part Number ou SKU Interno
  barcode?: string;
  name: string; // Nome da peça / componente
  description?: string; // Especificação técnica
  imageUrl?: string; // Foto da peça
  category: string; // Mecânica, Elétrica, Pneumática, etc.
  unit: ProductUnit;
  equipmentTag?: string; // TAG do equipamento/conjunto operacional (ex: BOM-01, MTR-02, DOS-01)
  operationalArea?: string; // Área/Setor de destinação principal (Ex: Linha 01, Galpão A)
  criticality?: MaintenanceCriticality; // HIGH = Crítica (Parada de Linha / Fábrica), MEDIUM = Importante, LOW = Baixa
  currentStock: number;
  minStock: number; // Estoque de segurança / Ponto de pedido
  maxStock?: number;
  costPrice: number; // Preço de custo unitário médio
  supplier?: string; // Fabricante / Fornecedor da peça
  location?: string; // Prateleira / Gaveteiro / Rua no almoxarifado
  createdAt: string;
  updatedAt: string;
}

export interface Movement {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitPrice: number; // Custo unitário da peça
  totalPrice: number; // Custo total aplicado
  reason: string; // Motivo da manutenção / entrada
  documentNumber?: string; // Nº da Ordem de Serviço (O.S.) ou Nota Fiscal de Compra
  contactName?: string; // TAG / Equipamento / Estação de destino ou Fornecedor de origem
  operationalArea?: string; // Local / Área Operacional de aplicação
  responsible: string; // Mecânico / Eletricista / Almoxarife requisitante
  notes?: string;
  timestamp: string;
}

export interface InventoryStats {
  totalProducts: number;
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  criticalAlertCount: number; // Peças críticas em nível de alerta
  totalCostValue: number; // Valor total imobilizado em peças de reposição
  totalAppliedMonthValue: number; // Custo total de peças aplicadas em O.S. no mês
  entriesTodayCount: number;
  exitsTodayCount: number;
}

export interface StockAuditItem {
  productId: string;
  systemStock: number;
  countedStock: number;
  difference: number;
  costDifference: number;
}

export type UserRole = 'ADMIN' | 'ALMOXARIFE' | 'PCM_ENG' | 'MECANICO' | 'CONSULTA';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: UserRole;
  active: boolean;
  avatarColor?: string;
  department?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface UserCredentials {
  username: string;
  password: string;
}

