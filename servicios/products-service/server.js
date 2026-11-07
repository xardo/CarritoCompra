require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());

// Ruta raíz informativa
app.get('/', (req, res) => {
  res.json({
    service: 'products-service',
    status: 'online',
    description: 'Microservicio de Catálogo de Productos',
    endpoints: {
      health: 'GET /health',
      getProducts: 'GET /products',
      getProductById: 'GET /products/:id',
      createProduct: 'POST /products (body: nombreproducto, imagenproducto, precio)',
      deleteProduct: 'DELETE /products/:id'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'products-service', status: 'healthy', timestamp: new Date() });
});

// Obtener todos los productos
app.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombreproducto, imagenproducto, precio FROM productos ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al obtener productos de la base de datos' });
  }
});

// Obtener un producto por ID
app.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT id, nombreproducto, imagenproducto, precio FROM productos WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
});

// Crear nuevo producto
app.post('/products', async (req, res) => {
  try {
    const { nombreproducto, imagenproducto, precio } = req.body;
    if (!nombreproducto || !imagenproducto || precio === undefined) {
      return res.status(400).json({ error: 'Campos obligatorios: nombreproducto, imagenproducto, precio' });
    }

    const numericPrice = parseFloat(precio);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ error: 'El precio debe ser un número válido mayor o igual a 0' });
    }

    const result = await pool.query(
      'INSERT INTO productos (nombreproducto, imagenproducto, precio) VALUES ($1, $2, $3) RETURNING id, nombreproducto, imagenproducto, precio',
      [nombreproducto, imagenproducto, numericPrice]
    );

    res.status(201).json({
      message: 'Producto creado exitosamente',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error interno al guardar el producto' });
  }
});

// Eliminar producto por ID
app.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM productos WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ message: 'Producto eliminado exitosamente', id: result.rows[0].id });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error interno al eliminar producto' });
  }
});

app.listen(PORT, () => {
  console.log(`Products Service corriendo en el puerto ${PORT}`);
});
