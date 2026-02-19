const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

/* ================= RESET DO BANCO ================= */

app.get('/resetar-banco', async (req, res) => {
  try {
    await pool.query('DROP TABLE IF EXISTS presencas CASCADE');
    await pool.query('DROP TABLE IF EXISTS materias CASCADE');
    await pool.query('DROP TABLE IF EXISTS sessoes CASCADE');

    await pool.query(`
      CREATE TABLE sessoes (
        id SERIAL PRIMARY KEY,
        data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        descricao TEXT,
        aberta BOOLEAN DEFAULT TRUE
      )
    `);

    await pool.query(`
      CREATE TABLE materias (
        id SERIAL PRIMARY KEY,
        sessao_id INTEGER REFERENCES sessoes(id),
        numero TEXT,
        titulo TEXT
      )
    `);

    await pool.query(`
      CREATE TABLE presencas (
        id SERIAL PRIMARY KEY,
        vereador_id INTEGER REFERENCES usuarios(id),
        sessao_id INTEGER REFERENCES sessoes(id),
        presente BOOLEAN DEFAULT TRUE
      )
    `);

    res.send('Banco legislativo resetado com sucesso');
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/* ================= FLUXO LEGISLATIVO ================= */

app.get('/abrir-sessao-teste', async (req, res) => {
  try {
    const result = await pool.query(`
      INSERT INTO sessoes (descricao, aberta)
      VALUES ('Sessão de Teste', true)
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/marcar-presenca-teste', async (req, res) => {
  try {
    const sessao = await pool.query(`
      SELECT id FROM sessoes WHERE aberta = true
      ORDER BY id DESC LIMIT 1
    `);

    if (!sessao.rows.length)
      return res.status(400).json({ erro: 'Nenhuma sessão aberta' });

    const vereadores = await pool.query(
      `SELECT id FROM usuarios WHERE perfil = 'vereador'`
    );

    for (const v of vereadores.rows) {
      await pool.query(
        `INSERT INTO presencas (vereador_id, sessao_id, presente)
         VALUES ($1, $2, true)
         ON CONFLICT DO NOTHING`,
        [v.id, sessao.rows[0].id]
      );
    }

    res.json({ mensagem: 'Presença registrada para todos vereadores' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/criar-materia-teste', async (req, res) => {
  try {
    const sessao = await pool.query(`
      SELECT id FROM sessoes WHERE aberta = true
      ORDER BY id DESC LIMIT 1
    `);

    if (!sessao.rows.length)
      return res.status(400).json({ erro: 'Nenhuma sessão aberta' });

    const materia = await pool.query(
      `INSERT INTO materias (sessao_id, numero, titulo)
       VALUES ($1, '001/2026', 'Projeto de Lei de Teste')
       RETURNING *`,
      [sessao.rows[0].id]
    );

    res.json(materia.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});
// VOTAR NA ÚLTIMA MATÉRIA DA SESSÃO
app.post('/votar-materia-atual', async (req, res) => {
  const { vereador_id, opcao } = req.body;

  try {
    // pegar última matéria da sessão aberta
    const materia = await pool.query(`
      SELECT m.id
      FROM materias m
      JOIN sessoes s ON s.id = m.sessao_id
      WHERE s.aberta = true
      ORDER BY m.id DESC
      LIMIT 1
    `);

    if (!materia.rows.length)
      return res.status(400).json({ erro: 'Nenhuma matéria ativa' });

    await pool.query(
      `INSERT INTO votos (vereador_id, materia_id, opcao)
       VALUES ($1, $2, $3)
       ON CONFLICT (vereador_id, materia_id)
       DO UPDATE SET opcao = EXCLUDED.opcao`,
      [vereador_id, materia.rows[0].id, opcao]
    );

    res.json({ mensagem: 'Voto registrado com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});
// TESTE: VOTO DO VEREADOR 1 = SIM
app.get('/teste-voto-vereador1', async (req, res) => {
  try {
    // pegar última matéria da sessão aberta
    const materia = await pool.query(`
      SELECT m.id
      FROM materias m
      JOIN sessoes s ON s.id = m.sessao_id
      WHERE s.aberta = true
      ORDER BY m.id DESC
      LIMIT 1
    `);

    if (!materia.rows.length)
      return res.status(400).json({ erro: 'Nenhuma matéria ativa' });

    await pool.query(
      `INSERT INTO votos (vereador_id, materia_id, opcao)
       VALUES (1, $1, 'SIM')
       ON CONFLICT (vereador_id, materia_id)
       DO UPDATE SET opcao = EXCLUDED.opcao`,
      [materia.rows[0].id]
    );

    res.json({ mensagem: 'Voto SIM do Vereador 1 registrado' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});
// RESULTADO DA MATÉRIA ATUAL
app.get('/resultado', async (req, res) => {
  try {
    const materia = await pool.query(`
      SELECT m.id
      FROM materias m
      JOIN sessoes s ON s.id = m.sessao_id
      WHERE s.aberta = true
      ORDER BY m.id DESC
      LIMIT 1
    `);

    if (!materia.rows.length)
      return res.status(400).json({ erro: 'Nenhuma matéria ativa' });

    const resultado = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN opcao = 'SIM' THEN 1 END), 0) AS sim,
        COALESCE(SUM(CASE WHEN opcao = 'NAO' THEN 1 END), 0) AS nao,
        COALESCE(SUM(CASE WHEN opcao = 'ABSTENCAO' THEN 1 END), 0) AS abstencao
      FROM votos
      WHERE materia_id = $1
    `, [materia.rows[0].id]);

    res.json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/* ================= PORTA ================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor rodando na porta', PORT));
