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
    const hash = await b
