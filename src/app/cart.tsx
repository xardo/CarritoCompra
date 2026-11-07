import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import { useApp, CartItem, SERVICES_CONFIG } from '../context/AppContext';
import { savePurchaseOffline } from '../services/offlineStorage';
import { syncPendingPurchases } from '../services/syncService';

interface InvoiceData {
  numero_factura: string;
  fecha: string;
  usuario: {
    nombre: string;
    correo: string;
  };
  items: CartItem[];
  subtotal: number;
  iva: number;
  total: number;
}

export default function CartScreen() {
  const router = useRouter();
  const { user, cart, removeFromCart, updateQuantity, clearCart, calculation, isCalculating } = useApp();
  const [processingOrder, setProcessingOrder] = useState<boolean>(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Proteger la vista: requiere inicio de sesión
  React.useEffect(() => {
    if (!user) {
      router.replace('/');
    }
  }, [user]);

  // Generador de HTML para el PDF y la impresión
  const generateInvoiceHtml = (data: InvoiceData) => {
    const itemsRows = data.items
      .map(
        (it) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${it.nombreproducto}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${it.cantidad}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${Number(it.precio).toFixed(2)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${(Number(it.precio) * it.cantidad).toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Factura ${data.numero_factura}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 40px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; }
            .company { font-size: 24px; font-weight: 800; }
            .invoice-title { font-size: 20px; font-weight: 700; color: #475569; text-align: right; }
            .meta { margin-top: 24px; display: flex; justify-content: space-between; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { background-color: #f8fafc; padding: 12px 10px; text-align: left; font-size: 13px; border-bottom: 2px solid #cbd5e1; }
            .totals { margin-top: 30px; margin-left: auto; width: 300px; font-size: 14px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .grand-total { font-size: 18px; font-weight: 800; color: #059669; border-top: 2px solid #0f172a; border-bottom: none; }
            .footer { margin-top: 50px; text-align: center; color: #94a3b8; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">Carrito Store</div>
              <div style="color: #64748b; font-size: 13px; margin-top: 4px;">Facturación Electrónica Microservicios</div>
            </div>
            <div>
              <div class="invoice-title">FACTURA</div>
              <div style="font-weight: 700; margin-top: 4px;">${data.numero_factura}</div>
            </div>
          </div>

          <div class="meta">
            <div>
              <strong>Cliente:</strong><br>
              ${data.usuario.nombre}<br>
              ${data.usuario.correo}
            </div>
            <div style="text-align: right;">
              <strong>Fecha de Emisión:</strong><br>
              ${data.fecha}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th style="text-align: center;">Cant.</th>
                <th style="text-align: right;">Precio Unit.</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>$${data.subtotal.toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span>IVA (19%):</span>
              <span>$${data.iva.toFixed(2)}</span>
            </div>
            <div class="totals-row grand-total">
              <span>Total Pagado:</span>
              <span>$${data.total.toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            ¡Gracias por su compra! Esta factura ha sido registrada exitosamente en Neon Database.
          </div>
        </body>
      </html>
    `;
  };

  const handlePrintOrPdf = async () => {
    if (!invoice) return;

    const html = generateInvoiceHtml(invoice);

    if (Platform.OS === 'web') {
      // En Web: abrimos un iframe invisible con solo el HTML limpio de la factura
      // de este modo NUNCA se imprimirán los botones de la pantalla ni el fondo
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();

        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          // Limpiar el iframe luego de imprimir
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 250);
      }
    } else {
      // En Móvil: expo-print genera el documento desde el HTML limpio sin botones
      try {
        await Print.printAsync({ html });
      } catch (e: any) {
        console.warn('Error imprimiendo:', e);
      }
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (!user) {
      const msg = 'Debes iniciar sesión para confirmar tu compra';
      if (Platform.OS !== 'web') Alert.alert('Atención', msg);
      else alert(msg);
      router.replace('/');
      return;
    }

    setProcessingOrder(true);
    try {
      // 1. Generar número de factura
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const numFactura = `FAC-${dateStr}-${randomSuffix}`;

      const subtotalVal = calculation?.subtotal || cart.reduce((acc, it) => acc + Number(it.precio) * it.cantidad, 0);
      const ivaVal = calculation?.iva || +(subtotalVal * 0.19).toFixed(2);
      const totalVal = calculation?.total || +(subtotalVal + ivaVal).toFixed(2);

      // 2. GUARDAR PRIMERO EN SQLITE LOCAL (Garantiza persistencia offline)
      await savePurchaseOffline({
        usuario_id: user.id,
        numero_factura: numFactura,
        items_json: JSON.stringify(cart),
        subtotal: subtotalVal,
        iva: ivaVal,
        total: totalVal
      });

      // 3. INTENTAR ENVIAR DIRECTO AL MICROSERVICIO EN RENDER
      const payload = JSON.stringify({
        usuario_id: user.id,
        items: cart
      });

      let response: Response | null = await fetch(`${SERVICES_CONFIG.GATEWAY_URL}/orders/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      }).catch(() => null);

      if (!response || !response.ok) {
        response = await fetch(`${SERVICES_CONFIG.ORDERS_URL}/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        }).catch(() => null);
      }

      // Si se envió con éxito a Render, sincronizamos de una vez
      if (response && response.ok) {
        console.log('🌐 [Red] Compra enviada con éxito a Neon Database en la nube.');
        syncPendingPurchases(); // Marca la compra local como synced = 1
      } else {
        console.warn('⚠️ [Offline] Sin internet o microservicio no disponible. La compra quedó segura en SQLite y se subirá automáticamente al tener red.');
      }

      // 4. Preparar la factura electrónica para visualizarla e imprimirla
      const invoiceGenerated: InvoiceData = {
        numero_factura: numFactura,
        fecha: new Date().toLocaleString(),
        usuario: {
          nombre: user.nombre,
          correo: user.correo
        },
        items: [...cart],
        subtotal: subtotalVal,
        iva: ivaVal,
        total: totalVal
      };

      setInvoice(invoiceGenerated);
      clearCart();
      setShowModal(true);
    } catch (err: any) {
      console.error('Error al realizar checkout:', err);
      const errorMsg = err.message || 'No se pudo conectar con el microservicio de compras';
      if (Platform.OS !== 'web') {
        Alert.alert('Error', errorMsg);
      } else {
        alert(errorMsg);
      }
    } finally {
      setProcessingOrder(false);
    }
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartCard}>
      <Image
        source={{ uri: item.imagenproducto || 'https://via.placeholder.com/150' }}
        style={styles.itemImage}
        resizeMode="cover"
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.nombreproducto}
        </Text>
        <Text style={styles.itemPrice}>
          ${parseFloat(item.precio as any).toFixed(2)} c/u
        </Text>

        <View style={styles.controlsRow}>
          <View style={styles.qtyContainer}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQuantity(item.id, -1)}
            >
              <Text style={styles.qtyBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.cantidad}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQuantity(item.id, 1)}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => removeFromCart(item.id)}
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteBtnText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {cart.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
          <Text style={styles.emptySubtitle}>Agrega productos desde el catálogo para visualizarlos aquí.</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.back()}
          >
            <Text style={styles.browseButtonText}>Ver Catálogo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCartItem}
            contentContainerStyle={styles.listContent}
          />

          {/* Resumen de Cálculo e IVA emitido por el microservicio */}
          <View style={styles.summaryCard}>
            <View style={styles.serviceHeader}>
              <Text style={styles.serviceTag}>Microservicio de Precios & IVA</Text>
              {(isCalculating || processingOrder) && (
                <ActivityIndicator size="small" color="#4f46e5" />
              )}
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({calculation?.totalItems || 0} arts.):</Text>
              <Text style={styles.summaryValue}>${calculation?.subtotal.toFixed(2) || '0.00'}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                IVA aplicado ({calculation?.ivaPercentage || '19%'}):
              </Text>
              <Text style={styles.summaryValue}>${calculation?.iva.toFixed(2) || '0.00'}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total a pagar:</Text>
              <Text style={styles.totalValue}>${calculation?.total.toFixed(2) || '0.00'}</Text>
            </View>

            <TouchableOpacity
              style={[styles.checkoutBtn, (isCalculating || processingOrder) && styles.btnDisabled]}
              onPress={handleCheckout}
              disabled={isCalculating || processingOrder}
            >
              {processingOrder ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.checkoutBtnText}>Confirmar y Guardar Compra</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Modal Factura imprimible / descargable */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowModal(false);
          router.replace('/products');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.invoiceModalCard}>
            <ScrollView contentContainerStyle={styles.invoiceScroll}>
              <View style={styles.invoiceHeader}>
                <View>
                  <Text style={styles.invoiceStoreName}>Carrito Store</Text>
                  <Text style={styles.invoiceStoreSub}>Factura de Venta Electrónica</Text>
                </View>
                <View style={styles.invoiceNumberBox}>
                  <Text style={styles.invoiceNumberLabel}>FACTURA N°</Text>
                  <Text style={styles.invoiceNumber}>{invoice?.numero_factura}</Text>
                </View>
              </View>

              <View style={styles.invoiceClientBox}>
                <Text style={styles.clientLabel}>Cliente: <Text style={styles.clientVal}>{invoice?.usuario.nombre}</Text></Text>
                <Text style={styles.clientLabel}>Correo: <Text style={styles.clientVal}>{invoice?.usuario.correo}</Text></Text>
                <Text style={styles.clientLabel}>Fecha: <Text style={styles.clientVal}>{invoice?.fecha}</Text></Text>
              </View>

              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeadText, { flex: 2 }]}>Producto</Text>
                <Text style={[styles.tableHeadText, { flex: 0.8, textAlign: 'center' }]}>Cant.</Text>
                <Text style={[styles.tableHeadText, { flex: 1, textAlign: 'right' }]}>Precio</Text>
                <Text style={[styles.tableHeadText, { flex: 1, textAlign: 'right' }]}>Total</Text>
              </View>

              {invoice?.items.map((it, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { flex: 2 }]} numberOfLines={1}>{it.nombreproducto}</Text>
                  <Text style={[styles.tableCellText, { flex: 0.8, textAlign: 'center' }]}>{it.cantidad}</Text>
                  <Text style={[styles.tableCellText, { flex: 1, textAlign: 'right' }]}>${Number(it.precio).toFixed(2)}</Text>
                  <Text style={[styles.tableCellText, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>
                    ${(Number(it.precio) * it.cantidad).toFixed(2)}
                  </Text>
                </View>
              ))}

              <View style={styles.invoiceTotals}>
                <View style={styles.invoiceTotalRow}>
                  <Text style={styles.subLabel}>Subtotal:</Text>
                  <Text style={styles.subVal}>${invoice?.subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.invoiceTotalRow}>
                  <Text style={styles.subLabel}>IVA (19%):</Text>
                  <Text style={styles.subVal}>${invoice?.iva.toFixed(2)}</Text>
                </View>
                <View style={[styles.invoiceTotalRow, styles.grandTotalBorder]}>
                  <Text style={styles.grandLabel}>Total Facturado:</Text>
                  <Text style={styles.grandVal}>${invoice?.total.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.printBtn}
                  onPress={handlePrintOrPdf}
                >
                  <Text style={styles.printBtnText}>📄 Imprimir / Guardar como PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => {
                    setShowModal(false);
                    router.replace('/products');
                  }}
                >
                  <Text style={styles.closeModalBtnText}>Cerrar y volver al catálogo</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  listContent: {
    padding: 16
  },
  cartCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center'
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#f3f4f6'
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827'
  },
  itemPrice: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 6
  },
  qtyBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center'
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151'
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 8
  },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  deleteBtnText: {
    fontSize: 12,
    color: '#ef4444'
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 5
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  serviceTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4f46e5',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6b7280'
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827'
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 10
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827'
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981'
  },
  checkoutBtn: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16
  },
  btnDisabled: {
    opacity: 0.6
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  invoiceModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 580,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10
  },
  invoiceScroll: {
    padding: 28
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
    paddingBottom: 16
  },
  invoiceStoreName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a'
  },
  invoiceStoreSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  invoiceNumberBox: {
    alignItems: 'flex-end'
  },
  invoiceNumberLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b'
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2
  },
  invoiceClientBox: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 10,
    marginVertical: 18,
    gap: 4
  },
  clientLabel: {
    fontSize: 13,
    color: '#64748b'
  },
  clientVal: {
    fontWeight: '700',
    color: '#0f172a'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  tableHeadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155'
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  tableCellText: {
    fontSize: 13,
    color: '#0f172a'
  },
  invoiceTotals: {
    marginTop: 20,
    paddingTop: 12,
    alignSelf: 'flex-end',
    width: 240
  },
  invoiceTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  subLabel: {
    fontSize: 13,
    color: '#64748b'
  },
  subVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a'
  },
  grandTotalBorder: {
    borderTopWidth: 2,
    borderTopColor: '#0f172a',
    paddingTop: 8,
    marginTop: 4
  },
  grandLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a'
  },
  grandVal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#059669'
  },
  actionRow: {
    marginTop: 28,
    gap: 12
  },
  printBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  printBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  closeModalBtn: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  closeModalBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600'
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827'
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20
  },
  browseButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  browseButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14
  }
});
