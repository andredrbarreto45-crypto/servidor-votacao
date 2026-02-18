const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// LISTAR USUÁRIOS
app.get('/usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, login, perfil FROM usuarios');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar usuários' });
  }
});
