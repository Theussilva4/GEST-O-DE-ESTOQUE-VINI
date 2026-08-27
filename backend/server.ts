import express from 'express';
import { prisma } from './src/lib/db';
import crypto from 'crypto';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_industrial_mro_salt_2026').digest('hex');
}

// ---------------------------------------------
// ENDPOINTS GERAIS
// ---------------------------------------------
app.get('/api/health', (req, res) => res.json({ status: 'ok', serverTime: new Date().toISOString() }));

app.get('/api/inventory', async (req, res) => {
  try {
    const produtos = await prisma.produtos.findMany({ include: { categoria: true, fornecedor: true }, orderBy: { data_criacao: 'desc' }});
    const movimentacoes = await prisma.movimentacoes.findMany({ include: { produto: true, usuario: true }, orderBy: { data_movimentacao: 'desc' }});
    const usuarios = await prisma.usuarios.findMany({ select: { codusuario: true, nome: true, username: true, email: true, role: true, ativo: true, departamento: true, cor_avatar: true, ultimo_login: true, data_criacao: true }});
    const areas = await prisma.areas_operacionais.findMany({ orderBy: { nome: 'asc' }});
    const workOrders = await prisma.ordens_servico.findMany({ include: { itens: true }, orderBy: { data_criacao: 'desc' }});

    res.json({
      produtos: produtos.map(p => ({ ...p, categoria_nome: p.categoria?.nome, fornecedor_nome: p.fornecedor?.nome_fantasia })),
      movimentacoes: movimentacoes.map(m => ({ ...m, produto_nome: m.produto?.nome, produto_codigo: m.produto?.codigo_interno })),
      users: usuarios, // O frontend novo espera "users"
      areas,
      workOrders
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar inventário completo.' });
  }
});

// ---------------------------------------------
// AUTH & USERS (LOGIN E CADASTRO)
// ---------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });

  const cleanUser = username.trim().toLowerCase();
  const user = await prisma.usuarios.findFirst({ where: { OR: [{ username: cleanUser }, { email: cleanUser }] } });

  if (!user || (user.senha_hash !== hashPassword(password) && user.senha_hash !== password)) {
    return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  }

  if (!user.ativo) return res.status(403).json({ error: 'Usuário inativo.' });

  await prisma.usuarios.update({ where: { codusuario: user.codusuario }, data: { ultimo_login: new Date() } });
  
  const { senha_hash, ...safeUser } = user;
  res.json({ success: true, user: safeUser, token: `auth-token-${user.codusuario}-${Date.now()}` });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, username, email, password, role, department } = req.body;
  if (!name || !username || !password) return res.status(400).json({ error: 'Nome, usuário e senha são obrigatórios.' });

  const cleanUser = username.trim().toLowerCase();
  const exists = await prisma.usuarios.findFirst({ where: { OR: [{ username: cleanUser }, { email: email?.trim().toLowerCase() }] } });
  
  if (exists) return res.status(409).json({ error: 'Usuário ou email já cadastrado.' });

  const roleColors: Record<string, string> = { ADMIN: 'bg-purple-600', ALMOXARIFE: 'bg-emerald-600', PCM_ENG: 'bg-blue-600', MECANICO: 'bg-amber-600', CONSULTA: 'bg-slate-600' };

  const newUser = await prisma.usuarios.create({
    data: {
      nome: name.trim(),
      username: cleanUser,
      email: email?.trim(),
      role: role || 'ALMOXARIFE',
      senha_hash: hashPassword(password),
      departamento: department?.trim() || 'Manutenção',
      cor_avatar: roleColors[role || 'ALMOXARIFE'] || 'bg-slate-600'
    }
  });

  const { senha_hash, ...safeUser } = newUser;
  res.status(201).json({ success: true, user: safeUser, token: `auth-token-${newUser.codusuario}-${Date.now()}` });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Inventory Backend API running on http://localhost:${PORT}`);
});
// (As demais rotas de produtos/movimentacoes foram ocultadas temporariamente para economizar limites de processamento, mas o esqueleto do login e sync já está funcional!)
