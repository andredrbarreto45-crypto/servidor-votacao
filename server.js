const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

/* ================= BANCO LEGISLATIVO ================= */

// criar tabelas
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
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// abrir sessão
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

// marcar presença
app.get('/marcar-presenca-teste', async (req, res) => {
  try {
    const sessao = await pool.query(`
      SELECT id FROM sessoes WHERE aberta = true
      ORDER BY id DESC LIMIT 1
    `);

    if (sessao.rows.length === 0)
      return res.status(400).json({ erro: 'Nenhuma sessão aberta' });

    const sessaoId = sessao.rows[0].id;

    const vereadores = await pool.query(`
      SELECT id FROM usuarios WHERE perfil = 'vereador'
    `);

    for (const v of vereadores.rows) {
      await pool.query(`
        INSERT INTO presencas (vereador_id, sessao_id, presente)
        VALUES ($1, $2, true)
        ON CONFLICT DO NOTHING
      `, [v.id, sessaoId]);
    }

    res.json({ mensagem: 'Presença registrada para todos vereadores' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// criar matéria
app.get('/criar-materia-teste', async (req, res) => {
  try {
    const sessao = await pool.query(`
      SELECT id FROM sessoes WHERE aberta = true
      ORDER BY id DESC LIMIT 1
    `);

    if (sessao.rows.length === 0)
      return res.status(400).json({ erro: 'Nenhuma sessão aberta' });

    const materia = await pool.query(`
      INSERT INTO materias (sessao_id, numero, titulo)
      VALUES ($1, '001/2026', 'Projeto de Lei de Teste')
      RETURNING *
    `, [sessao.rows[0].id]);

    res.json(materia.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});
// RESETAR BANCO LEGISLATIVO (APAGA E RECRIA)
app.get('/resetar-banco', async (req, res) => {
  try {
    await pool.query(`DROP TABLE IF EXISTS presencas`);
    await pool.query(`DROP TABLE IF EXISTS materias`);
    await pool.query(`DROP TABLE IF EXISTS sessoes`);

    await pool.query(`
      CREATE TABLE sessoes (
        id SERIAL PRIMARY KEY,
        data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        descricao TEXT,
        aberta BOOLEAN DEFAULT TRUE
      );
    `);

    await pool.query(`
      CREATE TABLE materias (
        id SERIAL PRIMARY KEY,
        sessao_id INTEGER REFERENCES sessoes(id),
        numero TEXT,
        titulo TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE presencas (
        id SERIAL PRIMARY KEY,
        vereador_id INTEGER REFERENCES usuarios(id),
        sessao_id INTEGER REFERENCES sessoes(id),
        presente BOOLEAN DEFAULT TRUE
      );
    `);

    res.send('Banco legislativo resetado com sucesso');
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/* ================= PORTA ================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor rodando na porta', PORT));
