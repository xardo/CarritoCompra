import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { SERVICES_CONFIG } from '../context/AppContext';
import { getPendingPurchases, markAsSynced, getAllOfflinePurchases } from './offlineStorage';

let isSyncing = false;

/**
 * Sincroniza todas las compras guardadas en SQLite local hacia el microservicio en Render / Neon Database
 */
export async function syncPendingPurchases(): Promise<number> {
  if (isSyncing) return 0;
  isSyncing = true;

  try {
    const pending = await getPendingPurchases();
    if (pending.length === 0) {
      console.log('🔄 [Sync] No hay compras pendientes en SQLite por sincronizar.');
      return 0;
    }

    console.log(`🔄 [Sync] Iniciando sincronización de ${pending.length} compra(s) desde SQLite hacia Neon DB...`);

    let syncedCount = 0;
    for (const record of pending) {
      const items = JSON.parse(record.items_json);

      const payload = {
        usuario_id: record.usuario_id,
        items: items
      };

      try {
        // Enviar a través de los microservicios
        let response: Response | null = await fetch(`${SERVICES_CONFIG.GATEWAY_URL}/orders/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => null);

        if (!response || !response.ok) {
          response = await fetch(`${SERVICES_CONFIG.ORDERS_URL}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }

        if (response.ok) {
          if (record.id) {
            await markAsSynced(record.id);
            syncedCount++;
          }
        }
      } catch (err) {
        console.warn(`[Sync] Error enviando compra #${record.numero_factura} a Render:`, err);
      }
    }

    console.log(`🎉 [Sync] Sincronización completada. ${syncedCount} de ${pending.length} compras subidas a Neon Database.`);
    return syncedCount;
  } catch (error) {
    console.error('Error durante la sincronización:', error);
    return 0;
  } finally {
    isSyncing = false;
  }
}

/**
 * Escucha cambios de conexión a internet para disparar la sincronización automáticamente
 */
export function initNetworkSyncListener(onSyncCompleted?: (count: number) => void) {
  return NetInfo.addEventListener((state: NetInfoState) => {
    console.log(`📶 [Red] Estado de conexión: ${state.isConnected && state.isInternetReachable !== false ? 'ONLINE' : 'OFFLINE'}`);
    if (state.isConnected && state.isInternetReachable !== false) {
      syncPendingPurchases().then(count => {
        if (count > 0 && onSyncCompleted) {
          onSyncCompleted(count);
        }
      });
    }
  });
}
