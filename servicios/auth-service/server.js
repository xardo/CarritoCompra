require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_cart_key_2026';

app.use(cors());
app.use(express.json());

// Ruta raíz informativa
app.get('/', (req, res) => {
  res.json({
    service: 'auth-service',
    status: 'online',
    description: 'Microservicio de Autenticación y Usuarios',
    endpoints: {
      health: 'GET /health',
      register: 'POST /register (body: nombre, correo, contrasena)',
      login: 'POST /login (body: correo, contrasena)',
      verify: 'GET /verify'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'auth-service', status: 'healthy', timestamp: new Date() });
});

// Registro de usuario
app.post('/register', async (req, res) => {
  try {
    const { nombre, correo, contrasena } = req.body;
    if (!nombre || !correo || !contrasena) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios: nombre, correo, contrasena' });
    }

    const userExists = await pool.query('SELECT id FROM usuarios WHERE correo = $1', [correo]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'El correo electrónico ya se encuentra registrado' });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, correo, contrasena) VALUES ($1, $2, $3) RETURNING id, nombre, correo',
      [nombre, correo, hashedPassword]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, correo: user.correo, nombre: user.nombre }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user,
      token
    });
  } catch (error) {
    console.error('Error en /register:', error);
    res.status(500).json({ error: 'Error interno del servidor al registrar usuario' });
  }
});

// Inicio de sesión (Login)
app.post('/login', async (req, res) => {
  try {
    const { correo, contrasena } = req.body;
    if (!correo || !contrasena) {
      return res.status(400).json({ error: 'Debe ingresar correo y contrasena' });
    }

    const result = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(contrasena, user.contrasena);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: user.id, correo: user.correo, nombre: user.nombre }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo
      },
      token
    });
  } catch (error) {
    console.error('Error en /login:', error);
    res.status(500).json({ error: 'Error interno del servidor al autenticar' });
  }
});

// Validar token
app.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ valid: false, error: 'Token no proporcionado' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (err) {
    res.status(401).json({ valid: false, error: 'Token inválido o expirado' });
  }
});

app.listen(PORT, () => {
  console.log(`Auth Service corriendo en el puerto ${PORT}`);
});
