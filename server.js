const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');
const PDFDocument = require('pdfkit');

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());

let votacaoAberta = false;

// ROTA PRINCIPAL
app.get('/', (req, res) => {
  res.send('API da Camara funcionando');
});

// LOGIN
app.post('/login', async (req, res) => {
  const { login, senha } = req.body;

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE login = $1', [login]);

    if (result.rows.length === 0) return res.status(401).json({ erro: 'Login inválido' });

    const usuario = result.rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) return res.status(401).json({ erro: 'Login inválido' });

    res.json({ id: usuario.id, nome: usuario.nome, perfil: usuario.perfil });
  } catch {
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// CRIAR PRESIDENTE
app.get('/criar-presidente', async (req, res) => {
  try {
    const hash = await bcrypt.hash('123', 10);

    await pool.query(`
      INSERT INTO usuarios (nome, login, senha_hash, perfil)
      VALUES ('Presidente da Câmara', 'presidente', $1, 'presidente')
      ON CONFLICT (login)
      DO UPDATE SET senha_hash = EXCLUDED.senha_hash
    `, [hash]);

    res.send('Senha do presidente atualizada com criptografia');
  } catch {
    res.status(500).json({ erro: 'Erro ao criar presidente' });
  }
});

// CRIAR 11 VEREADORES
app.get('/criar-vereadores', async (req, res) => {
  try {
    for (let i = 1; i <= 11; i++) {
      const hash = await bcrypt.hash('123', 10);

      await pool.query(`
        INSERT INTO usuarios (nome, login, senha_hash, perfil)
        VALUES ($1, $2, $3, 'vereador')
        ON CONFLICT (login)
        DO UPDATE SET senha_hash = EXCLUDED.senha_hash
      `, [`Vereador ${i}`, `ver${i}`, hash]);
    }

    res.send('11 vereadores criados/atualizados com sucesso');
  } catch {
    res.status(500).json({ erro: 'Erro ao criar vereadores' });
  }
});

// CRIAR TABELAS LEGISLATIVAS
app.get('/criar-tabelas', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessoes (
        id SERIAL PRIMARY KEY,
        data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        descricao TEXT,
        aberta BOOLEAN DEFAULT TRUE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS materias (
        id SERIAL PRIMARY KEY,
        sessao_id INTEGER REFERENCES sessoes(id),
        numero TEXT,
        titulo TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS presencas (
        id SERIAL PRIMARY KEY,
        vereador_id INTEGER REFERENCES usuarios(id),
        sessao_id INTEGER REFERENCES sessoes(id),
        presente BOOLEAN DEFAULT TRUE
      );
    `);

    res.send('Tabelas criadas com sucesso');
  } catch {
    res.status(500).json({ erro: 'Erro ao criar tabelas' });
  }
});

// CONTROLE DE VOTAÇÃO
app.post('/abrir-votacao', (req, res) => {
  votacaoAberta = true;
  res.json({ mensagem: 'Votação aberta' });
});

app.post('/encerrar-votacao', (req, res) => {
  votacaoAberta = false;
  res.json({ mensagem: 'Votação encerrada' });
});

// VOTAR
app.post('/votar', async (req, res) => {
  if (!votacaoAberta) return res.status(403).json({ erro: 'Votação encerrada' });

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

// RESULTADO TOTAL
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

// RESULTADO DETALHADO
app.get('/resultado-detalhado', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id AS vereador_id, u.nome, v.opcao
      FROM usuarios u
      LEFT JOIN votos v ON v.vereador_id = u.id AND v.materia_id = 1
      WHERE u.perfil = 'vereador'
      ORDER BY u.id
    `);

    res.json(result.rows);
  } catch {
    res.status(500).json({ erro: 'Erro ao buscar resultado detalhado' });
  }
});

// ATA PDF
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

// PORTA
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor rodando na porta', PORT));
