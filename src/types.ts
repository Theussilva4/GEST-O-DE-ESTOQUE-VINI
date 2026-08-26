export type MovementType = 'IN' | 'OUT' | 'ADJUST';

export type MaintenanceCriticality = 'HIGH' | 'MEDIUM' | 'LOW';

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
  equipmentTag?: string; // TAG da máquina/equipamento onde é aplicada (ex: Torno CNC-01, Caldeira B-2)
  criticality?: MaintenanceCriticality; // HIGH = Crítica (Parada de Fábrica), MEDIUM = Importante, LOW = Baixa
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
  contactName?: string; // TAG / Máquina / Setor de destino ou Fornecedor de origem
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

