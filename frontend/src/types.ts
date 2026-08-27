export type TipoMovimentacao = 'ENTRADA' | 'SAIDA' | 'AJUSTE';

export type CriticidadeManutencao = 'ALTA' | 'MEDIA' | 'BAIXA';

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

export type UnidadeProduto = 'UN' | 'KG' | 'L' | 'CX' | 'M' | 'PAR' | 'PCT' | 'ROLO' | 'JOGO' | 'KIT' | 'PECA';

export interface Produto {
  codproduto: string;
  codigo_interno: string;
  codigo_barras?: string;
  nome: string;
  descricao?: string;
  url_imagem?: string;
  codcategoria: string;
  // Para visualização no front (join)
  categoria_nome?: string;
  unidade_medida: UnidadeProduto | string;
  tag_equipamento?: string;
  criticidade: CriticidadeManutencao | string;
  estoque_atual: number;
  estoque_minimo: number;
  estoque_maximo?: number;
  preco_custo: number;
  preco_venda: number;
  codfornecedor?: string;
  fornecedor_nome?: string;
  localizacao_estoque?: string;
  data_criacao: string;
  data_atualizacao: string;
}

export interface Movimentacao {
  codmovimentacao: string;
  codproduto: string;
  produto_nome?: string;
  produto_codigo?: string;
  codusuario?: string;
  tipo_movimentacao: TipoMovimentacao | string;
  quantidade: number;
  estoque_anterior: number;
  estoque_novo: number;
  preco_unitario: number;
  preco_total: number;
  motivo_descricao: string;
  numero_documento?: string;
  nome_contato?: string;
  observacoes?: string;
  data_movimentacao: string;
}

export interface Categoria {
  codcategoria: string;
  nome: string;
  descricao?: string;
}

export interface Fornecedor {
  codfornecedor: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
}

export interface EstatisticasEstoque {
  totalProdutos: number;
  totalUnidades: number;
  estoqueBaixoCount: number;
  semEstoqueCount: number;
  alertasCriticosCount: number;
  valorTotalCusto: number;
  valorTotalAplicadoMes: number;
  entradasHojeCount: number;
  saidasHojeCount: number;
}

export interface ItemAuditoria {
  codproduto: string;
  estoque_sistema: number;
  estoque_contado: number;
  diferenca: number;
  diferenca_custo: number;
}
