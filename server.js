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
      WHERE materia_id = 1
    `);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar resultado' });
  }
});

// CRIAR TABELAS AUTOMATICAMENTE
async function inicializarBanco() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome TEXT,
        login TEXT UNIQUE,
        senha_hash TEXT,
        perfil TEXT,
        status BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS materias (
        id SERIAL PRIMARY KEY,
        titulo TEXT,
        status TEXT DEFAULT 'ABERTA'
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS votos (
        id SERIAL PRIMARY KEY,
        vereador_id INTEGER REFERENCES usuarios(id),
        materia_id INTEGER REFERENCES materias(id),
        opcao TEXT,
        UNIQUE (vereador_id, materia_id)
      );
    `);

    await pool.query(`
      INSERT INTO usuarios (nome, login, senha_hash, perfil)
      VALUES ('Vereador 1', 'ver1', '123', 'vereador')
      ON CONFLICT (login) DO NOTHING;
    `);

    await pool.query(`
      INSERT INTO materias (titulo, status)
      VALUES ('Projeto de Teste', 'ABERTA')
      ON CONFLICT DO NOTHING;
    `);

    console.log('Banco inicializado');
  } catch (err) {
    console.error('Erro ao inicializar banco:', err);
  }
}

inicializarBanco();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Servidor rodando na porta', PORT);
});

