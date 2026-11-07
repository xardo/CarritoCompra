import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

export interface PendingPurchase {
  id?: number;
  usuario_id: number;
  numero_factura: string;
  items_json: string;
  subtotal: number;
  iva: number;
  total: number;
  created_at?: string;
  synced: number; // 0 = pendiente, 1 = sincronizado
}

let dbInstance: any = null;

// Inicializa o abre la base de datos local SQLite
export async function getDatabase() {
  if (dbInstance) return dbInstance;
  try {
    if (Platform.OS === 'web') {
      // expo-sqlite usa wa-sqlite en navegador
      dbInstance = await SQLite.openDatabaseAsync('carrito_offline.db');
    } else {
      dbInstance = await SQLite.openDatabaseAsync('carrito_offline.db');
    }

    // Crear la tabla local de compras offline
    await dbInstance.execAsync(`
      CREATE TABLE IF NOT EXISTS compras_offline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        numero_factura TEXT NOT NULL,
        items_json TEXT NOT NULL,
        subtotal REAL NOT NULL,
        iva REAL NOT NULL,
        total REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0
      );
    `);

    console.log('[SQLite] Base de datos local inicializada exitosamente.');
    return dbInstance;
  } catch (error) {
    console.error('[SQLite] Error inicializando SQLite:', error);
    return null;
  }
}

// Guardar una compra en SQLite
export async function savePurchaseOffline(purchase: Omit<PendingPurchase, 'id' | 'created_at' | 'synced'>): Promise<number> {
  const db = await getDatabase();
  if (!db) {
    // Fallback de localStorage si SQLite web no está disponible
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const existing = JSON.parse(localStorage.getItem('compras_offline_backup') || '[]');
      const newRecord = { ...purchase, id: Date.now(), synced: 0, created_at: new Date().toISOString() };
      existing.push(newRecord);
      localStorage.setItem('compras_offline_backup', JSON.stringify(existing));
      console.log('📦 [Offline Storage] Guardado en fallback local:', newRecord);
      return newRecord.id;
    }
    return 0;
  }

  const result = await db.runAsync(
    `INSERT INTO compras_offline (usuario_id, numero_factura, items_json, subtotal, iva, total, synced)
     VALUES (?, ?, ?, ?, ?, ?, 0);`,
    [
      purchase.usuario_id,
      purchase.numero_factura,
      purchase.items_json,
      purchase.subtotal,
      purchase.iva,
      purchase.total
    ]
  );

  console.log(`\n========================================`);
  console.log(`📦 [SQLite] ¡COMPRA GUARDADA LOCALMENTE!`);
  console.log(`ID SQLite: ${result.lastInsertRowId}`);
  console.log(`Factura: ${purchase.numero_factura}`);
  console.log(`Subtotal: $${purchase.subtotal} | IVA: $${purchase.iva} | Total: $${purchase.total}`);
  console.log(`Estado: Pendiente de sincronizar a Neon Database (synced = 0)`);
  console.log(`========================================\n`);

  return result.lastInsertRowId;
}

// Obtener todas las compras guardadas en SQLite (tanto pendientes como sincronizadas)
export async function getAllOfflinePurchases(): Promise<PendingPurchase[]> {
  const db = await getDatabase();
  if (!db) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('compras_offline_backup') || '[]');
    }
    return [];
  }

  const rows = await db.getAllAsync(`SELECT * FROM compras_offline ORDER BY id DESC;`);
  console.log('\n📊 [SQLite] REGISTROS ACTUALES EN SQLITE LOCAL:');
  console.table ? console.table(rows) : console.log(rows);
  return rows as PendingPurchase[];
}

// Obtener solo las compras que no se han sincronizado (synced = 0)
export async function getPendingPurchases(): Promise<PendingPurchase[]> {
  const db = await getDatabase();
  if (!db) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const all: PendingPurchase[] = JSON.parse(localStorage.getItem('compras_offline_backup') || '[]');
      return all.filter(p => p.synced === 0);
    }
    return [];
  }

  const rows = await db.getAllAsync(`SELECT * FROM compras_offline WHERE synced = 0;`);
  return rows as PendingPurchase[];
}

// Marcar como sincronizada
export async function markAsSynced(localId: number) {
  const db = await getDatabase();
  if (db) {
    await db.runAsync(`UPDATE compras_offline SET synced = 1 WHERE id = ?;`, [localId]);
  } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const all: PendingPurchase[] = JSON.parse(localStorage.getItem('compras_offline_backup') || '[]');
    const updated = all.map(p => p.id === localId ? { ...p, synced: 1 } : p);
    localStorage.setItem('compras_offline_backup', JSON.stringify(updated));
  }
  console.log(`✅ [SQLite] Registro local #${localId} marcado como sincronizado.`);
}

// Guardar productos en caché local de SQLite
export async function cacheProductsLocally(products: any[]) {
  const db = await getDatabase();
  if (!db) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      localStorage.setItem('cached_products', JSON.stringify(products));
    }
    return;
  }

  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS productos_cache (
        id INTEGER PRIMARY KEY,
        nombreproducto TEXT NOT NULL,
        imagenproducto TEXT NOT NULL,
        precio REAL NOT NULL
      );
    `);

    for (const p of products) {
      await db.runAsync(
        `INSERT OR REPLACE INTO productos_cache (id, nombreproducto, imagenproducto, precio) VALUES (?, ?, ?, ?);`,
        [p.id, p.nombreproducto, p.imagenproducto, parseFloat(p.precio)]
      );
    }
    console.log(`📦 [SQLite] ${products.length} productos cacheados localmente para modo offline.`);
  } catch (e) {
    console.warn('[SQLite] Error cacheando productos:', e);
  }
}

// Obtener productos desde SQLite si no hay internet
export async function getLocalProducts(): Promise<any[]> {
  const db = await getDatabase();
  if (!db) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('cached_products') || '[]');
    }
    return [];
  }

  try {
    const rows = await db.getAllAsync(`SELECT * FROM productos_cache;`);
    return rows;
  } catch {
    return [];
  }
}

// Helper global para que puedas ejecutarlo desde la consola del navegador o terminal
if (typeof window !== 'undefined') {
  (window as any).verSQLite = getAllOfflinePurchases;
  (window as any).verProductosLocales = getLocalProducts;
}
