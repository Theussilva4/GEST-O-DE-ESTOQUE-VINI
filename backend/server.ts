import express from 'express';
import { prisma } from './src/lib/db';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// CORS (opcional se o proxy do Vite já estiver configurado, mas bom garantir se for rodar em domínios separados depois)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ==========================================
// API ROUTES
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// GET complete inventory state
app.get('/api/inventory', async (req, res) => {
  try {
    const products = await prisma.produtos.findMany({
      include: {
        categoria: true,
        fornecedor: true
      },
      orderBy: { data_criacao: 'desc' }
    });

    const movements = await prisma.movimentacoes.findMany({
      include: {
        produto: true,
        usuario: true
      },
      orderBy: { data_movimentacao: 'desc' }
    });

    // Adaptando os relacionamentos para o frontend (opcional)
    const formattedProducts = products.map(p => ({
      ...p,
      categoria_nome: p.categoria?.nome,
      fornecedor_nome: p.fornecedor?.nome_fantasia || p.fornecedor?.razao_social
    }));

    const formattedMovements = movements.map(m => ({
      ...m,
      produto_nome: m.produto?.nome,
      produto_codigo: m.produto?.codigo_interno
    }));

    res.json({
      produtos: formattedProducts,
      movimentacoes: formattedMovements,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar inventário.' });
  }
});

// POST Create new product
app.post('/api/products', async (req, res) => {
  const {
    codigo_interno,
    codigo_barras,
    nome,
    descricao,
    url_imagem,
    codcategoria, // front must send this now, or we find/create
    unidade_medida,
    estoque_atual,
    estoque_minimo,
    estoque_maximo,
    preco_custo,
    preco_venda,
    codfornecedor,
    localizacao_estoque,
    tag_equipamento,
    criticidade,
  } = req.body;

  if (!nome || !codcategoria) {
    return res.status(400).json({ error: 'Nome e Categoria são obrigatórios.' });
  }

  try {
    // Para simplificar, como o front enviava o nome da categoria como string antes,
    // se o 'codcategoria' não for um UUID, podemos assumir que é o nome da categoria e buscar/criar.
    let categoriaId = codcategoria;
    
    // Validar se codcategoria é um nome ao invés de ID (ajuste rápido para o front antigo)
    if (codcategoria && !codcategoria.includes('-')) {
      const cat = await prisma.categorias.upsert({
        where: { nome: codcategoria },
        update: {},
        create: { nome: codcategoria }
      });
      categoriaId = cat.codcategoria;
    }

    const initialQty = Number(estoque_atual) || 0;
    const cost = Number(preco_custo) || 0;
    const sell = Number(preco_venda) || cost;
    const min = Number(estoque_minimo) || 0;

    const newProduct = await prisma.produtos.create({
      data: {
        codigo_interno: codigo_interno?.trim() || `MNT-${Date.now().toString().slice(-6)}`,
        codigo_barras: codigo_barras?.trim() || null,
        nome: nome.trim(),
        descricao: descricao?.trim() || null,
        url_imagem: url_imagem?.trim() || null,
        codcategoria: categoriaId,
        unidade_medida: (unidade_medida || 'UN').toUpperCase(),
        estoque_atual: initialQty,
        estoque_minimo: min,
        estoque_maximo: estoque_maximo ? Number(estoque_maximo) : null,
        preco_custo: cost,
        preco_venda: sell,
        localizacao_estoque: localizacao_estoque?.trim() || null,
        tag_equipamento: tag_equipamento?.trim() || null,
        criticidade: criticidade || 'BAIXA',
      }
    });

    // If initial stock > 0, log movement
    if (initialQty > 0) {
      await prisma.movimentacoes.create({
        data: {
          codproduto: newProduct.codproduto,
          tipo_movimentacao: 'ENTRADA',
          quantidade: initialQty,
          estoque_anterior: 0,
          estoque_novo: initialQty,
          preco_unitario: cost,
          preco_total: initialQty * cost,
          motivo_descricao: 'Cadastro Inicial de Sobressalente',
          numero_documento: 'CADASTRO-INICIAL',
          nome_contato: 'Estoque Inicial',
          observacoes: 'Entrada automática gerada no cadastro'
        }
      });
    }

    // Retornar os novos dados atualizados
    const movements = await prisma.movimentacoes.findMany({ orderBy: { data_movimentacao: 'desc' }, include: { produto: true }});
    const formattedMovements = movements.map(m => ({ ...m, produto_nome: m.produto?.nome, produto_codigo: m.produto?.codigo_interno }));

    res.status(201).json({ 
      produto: newProduct, 
      movimentacoes: formattedMovements 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar produto.' });
  }
});

// PUT Update existing product
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const updated = await prisma.produtos.update({
      where: { codproduto: id },
      data: {
        nome: req.body.nome,
        descricao: req.body.descricao,
        preco_custo: req.body.preco_custo !== undefined ? Number(req.body.preco_custo) : undefined,
        preco_venda: req.body.preco_venda !== undefined ? Number(req.body.preco_venda) : undefined,
        estoque_minimo: req.body.estoque_minimo !== undefined ? Number(req.body.estoque_minimo) : undefined,
        estoque_maximo: req.body.estoque_maximo !== undefined ? Number(req.body.estoque_maximo) : undefined,
        localizacao_estoque: req.body.localizacao_estoque,
        tag_equipamento: req.body.tag_equipamento,
        criticidade: req.body.criticidade,
        // (codcategoria e codfornecedor omitidos para simplificar, mas podem ser adicionados)
      }
    });

    res.json({ produto: updated });
  } catch (error) {
    console.error(error);
    res.status(404).json({ error: 'Produto não encontrado ou erro na atualização.' });
  }
});

// DELETE Product
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Deletar movimentacoes relacionadas primeiro
    await prisma.movimentacoes.deleteMany({
      where: { codproduto: id }
    });

    const deleted = await prisma.produtos.delete({
      where: { codproduto: id }
    });
    
    res.json({ success: true, deletedProduct: deleted });
  } catch (error) {
    console.error(error);
    res.status(404).json({ error: 'Produto não encontrado.' });
  }
});

// POST Register Movement
app.post('/api/movements', async (req, res) => {
  const {
    codproduto,
    tipo_movimentacao, // 'ENTRADA' | 'SAIDA' | 'AJUSTE'
    quantidade,
    preco_unitario,
    motivo_descricao,
    numero_documento,
    nome_contato,
    observacoes,
  } = req.body;

  const qty = Number(quantidade);
  if (!codproduto || !tipo_movimentacao || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Produto, tipo e quantidade positiva são obrigatórios.' });
  }

  try {
    // Transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.produtos.findUnique({ where: { codproduto }});
      if (!product) throw new Error('Produto não encontrado');

      const prevStock = Number(product.estoque_atual);
      let newStock = prevStock;

      if (tipo_movimentacao === 'ENTRADA') newStock = prevStock + qty;
      else if (tipo_movimentacao === 'SAIDA') newStock = Math.max(0, prevStock - qty);
      else if (tipo_movimentacao === 'AJUSTE') newStock = qty; // Direto

      const finalQty = tipo_movimentacao === 'AJUSTE' ? Math.abs(newStock - prevStock) : qty;
      const price = Number(preco_unitario) || (tipo_movimentacao === 'ENTRADA' ? Number(product.preco_custo) : Number(product.preco_venda));

      const movement = await tx.movimentacoes.create({
        data: {
          codproduto,
          tipo_movimentacao,
          quantidade: finalQty,
          estoque_anterior: prevStock,
          estoque_novo: newStock,
          preco_unitario: price,
          preco_total: finalQty * price,
          motivo_descricao: motivo_descricao || (tipo_movimentacao === 'ENTRADA' ? 'Entrada' : 'Saída'),
          numero_documento: numero_documento || null,
          nome_contato: nome_contato || null,
          observacoes: observacoes || null,
        }
      });

      const updatedProduct = await tx.produtos.update({
        where: { codproduto },
        data: { 
          estoque_atual: newStock,
          preco_custo: (tipo_movimentacao === 'ENTRADA' && Number(preco_unitario) > 0) ? Number(preco_unitario) : product.preco_custo
        }
      });

      return { movement, updatedProduct };
    });

    const products = await prisma.produtos.findMany({ orderBy: { data_criacao: 'desc' }});
    const movements = await prisma.movimentacoes.findMany({ orderBy: { data_movimentacao: 'desc' }, include: { produto: true }});
    const formattedMovements = movements.map(m => ({ ...m, produto_nome: m.produto?.nome, produto_codigo: m.produto?.codigo_interno }));

    res.status(201).json({
      movimentacao: result.movement,
      produto: result.updatedProduct,
      produtos: products,
      movimentacoes: formattedMovements,
    });
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Erro ao lançar movimentação.' });
  }
});

// DELETE Movement
app.delete('/api/movements/:id', async (req, res) => {
  // Simplificado por limitação de tamanho. Você pode implementar o estorno reverso depois.
  res.status(501).json({ error: 'Estorno será implementado na v2 com Postgres.' });
});

// Reconcile
app.post('/api/inventory/reconcile', async (req, res) => {
  res.status(501).json({ error: 'Balanço em lote será implementado na v2 com transações do Postgres.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Inventory Backend API running on http://localhost:${PORT}`);
});
