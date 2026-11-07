require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('--- Creando tablas en Neon Database ---');
    // Tabla usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        correo VARCHAR(150) UNIQUE NOT NULL,
        contrasena VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabla productos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        nombreproducto VARCHAR(150) NOT NULL,
        imagenproducto TEXT NOT NULL,
        precio NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabla compras_usuario (Factura / Compra de productos por usuario)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS compras_usuario (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
        numero_factura VARCHAR(50) NOT NULL,
        cantidad INTEGER NOT NULL DEFAULT 1,
        precio_unitario NUMERIC(10, 2) NOT NULL,
        subtotal NUMERIC(10, 2) NOT NULL,
        iva NUMERIC(10, 2) NOT NULL,
        total NUMERIC(10, 2) NOT NULL,
        fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Tablas "usuarios", "productos" y "compras_usuario" creadas o verificadas con éxito.');

    // Usuario demo
    const checkUser = await pool.query('SELECT * FROM usuarios WHERE correo = $1', ['admin@demo.com']);
    if (checkUser.rows.length === 0) {
      const hash = await bcrypt.hash('123456', 10);
      await pool.query(
        'INSERT INTO usuarios (nombre, correo, contrasena) VALUES ($1, $2, $3)',
        ['Admin Demo', 'admin@demo.com', hash]
      );
      console.log('Usuario de prueba insertado: admin@demo.com / 123456');
    } else {
      console.log('El usuario de prueba ya existe.');
    }

    // Productos demo
    const checkProd = await pool.query('SELECT COUNT(*) FROM productos');
    if (parseInt(checkProd.rows[0].count) === 0) {
      const demoProducts = [
        ['Laptop Gamer Pro', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500&q=80', 1250.00],
        ['Auriculares Inalámbricos', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80', 79.99],
        ['Teclado Mecánico RGB', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&q=80', 89.50],
        ['Mouse Ergonómico', 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&q=80', 35.00],
        ['Monitor 4K UltraWide', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&q=80', 399.00]
      ];

      for (const p of demoProducts) {
        await pool.query(
          'INSERT INTO productos (nombreproducto, imagenproducto, precio) VALUES ($1, $2, $3)',
          p
        );
      }
      console.log('Productos demo insertados con éxito.');
    } else {
      console.log('Ya existen productos en la base de datos.');
    }

    console.log('Seeder completado satisfactoriamente.');
    process.exit(0);
  } catch (err) {
    console.error('Error ejecutando el seeder:', err);
    process.exit(1);
  }
}

seed();
