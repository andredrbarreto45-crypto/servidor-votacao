const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');
const PDFDocument = require('pdfkit');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

let votacaoAberta = false;

app.get('/', (req, res) => {
  res.send('API da Camara funcionando');
});

app.get('/usuarios', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nome, login, perfil FROM usuarios ORDER BY id'
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ erro: 'Erro ao buscar usuários' });
  }
});

app.post('/login', async (req, res) => {
  const { login, senha } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE login = $1',
      [login]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ erro: 'Login inválido' });
    }

    const usuario = result.rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ erro: 'Login inválido' });
    }

    res.json({ id: usuario.id, nome: usuario.nome, perfil: usuario.perfil });
  } catch {
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

app.get('/criar-presidente', async (req, res) => {
  try {
    const hash = await bcrypt.hash('123', 10);

    await pool.query(
      `INSERT INTO usuarios (nome, login, senha_hash, perfil)
       VALUES ('Presidente da Câmara', 'presidente', $1, 'presidente')
       ON CONFLICT (login)
       DO UPDATE SET senha_hash = EXCLUDED.senha_hash`,
      [hash]
    );

    res.send('Senha do presidente atualizada com criptografia');
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar presidente' });
  }
});
    await pool.query(
      `INSERT INTO usuarios (nome, login, senha_hash, perfil)
       VALUES ('Presidente da Câmara', 'presidente', $1, 'presidente')
       ON CONFLICT (login) DO NOTHING`,
      [hash]
    );

    res.send('Presidente criado com senha criptografada');
  } catch {
    res.status(500).json({ erro: 'Erro ao criar presidente' });
  }
});

app.post('/abrir-votacao', (req, res) => {
  votacaoAberta = true;
  res.json({ mensagem: 'Votação aberta' });
});

app.post('/encerrar-votacao', (req, res) => {
  votacaoAberta = false;
  res.json({ mensagem: 'Votação encerrada' });
});

app.post('/votar', async (req, res) => {
  if (!votacaoAberta) {
    return res.status(403).json({ erro: 'Votação encerrada' });
  }

  const { vereador_id, materia_id, opcao } = req.body;

  try {
    await pool.query(
      'INSERT INTO votos (vereador_id, materia_id, opcao) VALUES ($1, $2, $3)',
      [vereador_id, materia_id, opcao]
    );

    res.json({ sucesso: true });
  } catch {
    res.status(400).json({ erro: 'Voto já registrado ou inválido' });
  }
});

app.get('/resultado', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN opcao = 'SIM' THEN 1 END), 0) AS sim,
        COALESCE(SUM(CASE WHEN opcao = 'NAO' THEN 1 END), 0) AS nao,
        COALESCE(SUM(CASE WHEN opcao = 'ABSTENCAO' THEN 1 END), 0) AS abstencao
      FROM votos
      WHERE materia_id = 1
    `);

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro ao buscar resultado' });
  }
});

app.get('/ata', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN opcao = 'SIM' THEN 1 END), 0) AS sim,
        COALESCE(SUM(CASE WHEN opcao = 'NAO' THEN 1 END), 0) AS nao,
        COALESCE(SUM(CASE WHEN opcao = 'ABSTENCAO' THEN 1 END), 0) AS abstencao
      FROM votos
      WHERE materia_id = 1
    `);

    const { sim, nao, abstencao } = result.rows[0];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=ata.pdf');

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(16).text('CÂMARA MUNICIPAL - ATA DE VOTAÇÃO', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Data: ${new Date().toLocaleString()}`);
    doc.moveDown();
    doc.text(`SIM: ${sim}`);
    doc.text(`NÃO: ${nao}`);
    doc.text(`ABSTENÇÃO: ${abstencao}`);
    doc.moveDown();
    doc.text('Nada mais havendo a tratar, foi encerrada a presente votação.');

    doc.end();
  } catch {
    res.status(500).json({ erro: 'Erro ao gerar ata' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Servidor rodando na porta', PORT);
});
