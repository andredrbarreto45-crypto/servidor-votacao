const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// ROTA PRINCIPAL
app.get('/', (req, res) => {
  res.send('API da Camara funcionando');
});

// LISTAR USUÁRIOS
app.get('/usuarios', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nome, login, perfil FROM usuarios ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar usuários' });
  }
});

// LOGIN
app.post('/login', async (req, res) => {
  const { login, senha } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE login = $1 AND senha_hash = $2',
      [login, senha]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ erro: 'Login inválido' });
    }

    res.json({ usuario: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// VOTAR
app.post('/votar', async (req, res) => {
  const { vereador_id, materia_id, opcao } = req.body;
if (!votacaoAberta) {
  return res.status(403).json({ erro: 'Votação encerrada' });
}

  try {
    await pool.query(
      'INSERT INTO votos (vereador_id, materia_id, opcao) VALUES ($1, $2, $3)',
      [vereador_id, materia_id, opcao]
    );

    res.json({ sucesso: true });
  } catch (err) {
    res.status(400).json({ erro: 'Voto já registrado ou inválido' });
  }
});

// RESULTADO
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
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar resultado' });
  }
});
// CRIAR PRESIDENTE (temporário)
app.get('/criar-presidente', async (req, res) => {
  try {
    await pool.query(`
      INSERT INTO usuarios (nome, login, senha_hash, perfil)
      VALUES ('Presidente da Câmara', 'presidente', '123', 'presidente')
      ON CONFLICT (login) DO NOTHING;
    `);

    res.send('Presidente criado');
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar presidente' });
  }
});

// PORTA RENDER
const PORT = process.env.PORT || 3000;
// ESTADO DA VOTAÇÃO
let votacaoAberta = false;

// ABRIR VOTAÇÃO
app.post('/abrir-votacao', (req, res) => {
  votacaoAberta = true;
  res.json({ mensagem: 'Votação aberta' });
});

// ENCERRAR VOTAÇÃO
app.post('/encerrar-votacao', (req, res) => {
  votacaoAberta = false;
  res.json({ mensagem: 'Votação encerrada' });
});
const PDFDocument = require('pdfkit');

// GERAR ATA EM PDF
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

    doc.fontSize(16).text('CÂMARA MUNICIPAL - ATA DE VOTAÇÃO', {
      align: 'center'
    });

    doc.moveDown();
    doc.fontSize(12).text(`Data: ${new Date().toLocaleString()}`);

    doc.moveDown();
    doc.text(`Resultado da votação:`);
    doc.text(`SIM: ${sim}`);
    doc.text(`NÃO: ${nao}`);
    doc.text(`ABSTENÇÃO: ${abstencao}`);

    doc.moveDown();
    doc.text(
      'Nada mais havendo a tratar, foi encerrada a presente votação, sendo lavrada a presente ata que será assinada pelos membros da Mesa Diretora.',
      { align: 'justify' }
    );

    doc.end();
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao gerar ata' });
  }
});

app.listen(PORT, () => {
  console.log('Servidor rodando na porta', PORT);
});
