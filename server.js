const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// ROTA PRINCIPAL
app.get('/', (req, res) => {
  res.send('API da Camara funcionando');
});

// LISTAR USUÁRIOS
app.get('/usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, login, perfil FROM usuarios');
    res.json(result.rows);
  } catch (err) {
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
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// VOTAR
app.post('/votar', async (req, res) => {
  const { vereador_id, materia_id, opcao } = req.body;

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

// PORTA DO RENDER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Servidor rodando na porta', PORT);
});
