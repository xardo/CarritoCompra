require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 4003;
// Tasa de IVA por defecto 19%
const TAX_RATE = parseFloat(process.env.TAX_RATE || '0.19'); 

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'orders-service', status: 'healthy', taxRate: TAX_RATE, timestamp: new Date() });
});

/**
 * Endpoint para cálculo de precios, IVA y total de una lista de items
 * Recibe: { items: [ { id, nombreproducto, precio, cantidad } ] }
 */
app.post('/calculate', (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Se requiere una lista "items" en el cuerpo de la petición' });
    }

    let subtotal = 0;
    const detailedItems = items.map(item => {
      const price = parseFloat(item.precio) || 0;
      const quantity = parseInt(item.cantidad, 10) || 1;
      const itemSubtotal = price * quantity;
      subtotal += itemSubtotal;

      return {
        id: item.id,
        nombreproducto: item.nombreproducto,
        precio: price,
        cantidad: quantity,
        subtotal: parseFloat(itemSubtotal.toFixed(2))
      };
    });

    const iva = parseFloat((subtotal * TAX_RATE).toFixed(2));
    const total = parseFloat((subtotal + iva).toFixed(2));

    res.json({
      items: detailedItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      ivaRate: TAX_RATE,
      ivaPercentage: `${TAX_RATE * 100}%`,
      iva: iva,
      total: total,
      totalItems: detailedItems.reduce((acc, curr) => acc + curr.cantidad, 0)
    });
  } catch (error) {
    console.error('Error al calcular totales:', error);
    res.status(500).json({ error: 'Error interno al procesar el cálculo' });
  }
});

/**
 * Endpoint para procesar y confirmar la compra:
 * Guarda en la tabla `compras_usuario` vinculando usuario_id, producto_id y numero_factura
 * Recibe: { usuario_id, items: [ { id, precio, cantidad } ] }
 */
app.post('/checkout', async (req, res) => {
  const client = await pool.connect();
  try {
    const { usuario_id, items } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ error: 'usuario_id es requerido para registrar la compra' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'La lista de items no puede estar vacía' });
    }

    // Generar un número de factura único (ej. FAC-20261107-XXXX)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const numero_factura = `FAC-${dateStr}-${randomSuffix}`;

    // Iniciar transacción SQL para garantizar integridad relacional
    await client.query('BEGIN');

    let totalOrden = 0;
    let subtotalOrden = 0;
    let ivaOrden = 0;
    const registrosGuardados = [];

    for (const item of items) {
      const cantidad = parseInt(item.cantidad, 10) || 1;
      const precioUnitario = parseFloat(item.precio) || 0;
      const subtotalItem = parseFloat((precioUnitario * cantidad).toFixed(2));
      const ivaItem = parseFloat((subtotalItem * TAX_RATE).toFixed(2));
      const totalItem = parseFloat((subtotalItem + ivaItem).toFixed(2));

      subtotalOrden += subtotalItem;
      ivaOrden += ivaItem;
      totalOrden += totalItem;

      const insertQuery = `
        INSERT INTO compras_usuario 
        (usuario_id, producto_id, numero_factura, cantidad, precio_unitario, subtotal, iva, total)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;

      const result = await client.query(insertQuery, [
        usuario_id,
        item.id,
        numero_factura,
        cantidad,
        precioUnitario,
        subtotalItem,
        ivaItem,
        totalItem
      ]);

      registrosGuardados.push(result.rows[0]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Compra registrada y guardada exitosamente en la base de datos',
      numero_factura,
      resumen: {
        subtotal: parseFloat(subtotalOrden.toFixed(2)),
        iva: parseFloat(ivaOrden.toFixed(2)),
        total: parseFloat(totalOrden.toFixed(2)),
        itemsCount: registrosGuardados.length
      },
      detalles: registrosGuardados
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al procesar la compra:', error);
    res.status(500).json({ error: 'Error interno al registrar la compra en la base de datos' });
  } finally {
    client.release();
  }
});

/**
 * Obtener compras realizadas por un usuario
 */
app.get('/user-orders/:usuario_id', async (req, res) => {
  try {
    const { usuario_id } = req.params;
    const query = `
      SELECT c.*, p.nombreproducto, p.imagenproducto 
      FROM compras_usuario c
      JOIN productos p ON c.producto_id = p.id
      WHERE c.usuario_id = $1
      ORDER BY c.fecha_compra DESC;
    `;
    const result = await pool.query(query, [usuario_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar compras de usuario:', error);
    res.status(500).json({ error: 'Error al consultar historial de compras' });
  }
});

app.listen(PORT, () => {
  console.log(`Orders/Tax Service corriendo en el puerto ${PORT}`);
});
