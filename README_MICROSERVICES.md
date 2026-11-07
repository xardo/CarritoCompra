# Proyecto Carrito de Compras con Microservicios

Este proyecto cuenta con una arquitectura de **Microservicios en Node.js**, base de datos PostgreSQL en **Neon Database**, soporte para despliegue en **Render** y aplicación móvil/web minimalista en **React Native / Expo**.

---

## 🏗️ Estructura en la Carpeta `servicios/`

1. **Auth Service (`servicios/auth-service`)**:
   - Puerto local: `4001`
   - Gestión de usuarios: `nombre`, `correo`, `contrasena` (encriptada con bcrypt).
   - Generación y verificación de tokens JWT.
   - Script Seeder para crear tablas e inicializar datos.

2. **Products Service (`servicios/products-service`)**:
   - Puerto local: `4002`
   - Catálogo de productos: `id` (autonumérico), `nombreproducto`, `imagenproducto` (links URL), `precio`.
   - Consulta y creación de productos.

3. **Orders / Tax Service (`servicios/orders-service`)**:
   - Puerto local: `4003`
   - Cálculo del subtotal, IVA (19%) y total final.
   - Guardado de compras por usuario en la tabla `compras_usuario` (con número de factura único).

4. **API Gateway (`servicios/gateway`)**:
   - Puerto local: `4000`
   - Enrutador unificado para la app cliente hacia todos los microservicios.

---

## 🗄️ Base de Datos & Tablas (Neon Database)

El seeder ya fue ejecutado y ha creado las tablas necesarias:
- `usuarios` (`id`, `nombre`, `correo`, `contrasena`, `created_at`)
- `productos` (`id`, `nombreproducto`, `imagenproducto`, `precio`, `created_at`)
- `compras_usuario` (`id`, `usuario_id`, `producto_id`, `numero_factura`, `cantidad`, `precio_unitario`, `subtotal`, `iva`, `total`, `fecha_compra`)

**Usuario de prueba creado:**
- **Correo:** `admin@demo.com`
- **Contraseña:** `123456`

---

## 🚀 Cómo ejecutar en desarrollo local

```bash
# Terminal 1: Auth Service
cd servicios/auth-service
npm start

# Terminal 2: Products Service
cd servicios/products-service
npm start

# Terminal 3: Orders Service
cd servicios/orders-service
npm start

# Terminal 4: API Gateway
cd servicios/gateway
npm start

# Terminal 5: Aplicación Expo
npx expo start
```

---

## ☁️ Cómo desplegar en Render

Se ha configurado el archivo [render.yaml](file:///c:/Users/Estudiantes/Downloads/CarritoCompra/render.yaml) con la nueva ruta `servicios/`:

1. En [Render.com](https://render.com/), haz clic en **New +** > **Blueprint**.
2. Conecta tu repositorio.
3. Render leerá `render.yaml` y creará automáticamente los 4 servicios apuntando a la carpeta `servicios/`.
4. Una vez desplegado, copia la URL de `carrito-gateway` y colócala en `API_BASE_URL` en [AppContext.tsx](file:///c:/Users/Estudiantes/Downloads/CarritoCompra/src/context/AppContext.tsx#L5).
