const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API da Camara funcionando');
});

app.get('/usuarios', async (req, res) => {
  const result = await pool.query('SELECT * FROM usuarios');
  res.json(result.rows);
});

// REGISTRAR VOTO COM VERIFICAÇÃO DE STATUS
app.post('/votar', async (req, res) => {
  const { vereador_id, materia_id, opcao } = req.body;

  try {
    const materia = await pool.query(
      "SELECT status FROM materias WHERE id = $1",
      [materia_id]
    );

    if (!materia.rows.length || materia.rows[0].status !== 'ABERTA') {
      return res.status(403).json({ erro: 'Votação encerrada' });
    }

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
      WHERE materia_id = 2
    `);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar resultado' });
  }
});

// ABRIR VOTAÇÃO
app.post('/abrir', async (req, res) => {
  await pool.query("UPDATE materias SET status='ABERTA' WHERE id=2");
  res.json({ ok: true });
});

// ENCERRAR VOTAÇÃO
app.post('/encerrar', async (req, res) => {
  await pool.query("UPDATE materias SET status='FECHADA' WHERE id=2");
  res.json({ ok: true });
});
const PDFDocument = require('pdfkit');

app.get('/relatorio', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN opcao = 'SIM' THEN 1 END), 0) AS sim,
        COALESCE(SUM(CASE WHEN opcao = 'NAO' THEN 1 END), 0) AS nao,
        COALESCE(SUM(CASE WHEN opcao = 'ABSTENCAO' THEN 1 END), 0) AS abstencao
      FROM votos
      WHERE materia_id = 2
    `);

    const { sim, nao, abstencao } = result.rows[0];

    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=relatorio.pdf');

    doc.pipe(res);

    doc.fontSize(18).text('CÂMARA MUNICIPAL DE SANTO ANTÔNIO DO TAUÁ', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text('Relatório de Resultado da Votação', { align: 'center' });

    doc.moveDown();
    doc.text(`SIM: ${sim}`);
    doc.text(`NÃO: ${nao}`);
    doc.text(`ABSTENÇÃO: ${abstencao}`);

    doc.end();
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao gerar relatório' });
  }
});
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
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor rodando na porta', PORT);
});

