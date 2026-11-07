# Proyecto Carrito de Compras con Microservicios

Este proyecto cuenta con una arquitectura de **Microservicios en Node.js**, base de datos PostgreSQL en **Neon Database**, soporte para despliegue en **Render** y aplicación móvil/web minimalista en **React Native / Expo**.

---

## 🏗️ Arquitectura de Microservicios

1. **Auth Service (`backend/auth-service`)**:
   - Puerto local: `4001`
   - Gestión de usuarios: `nombre`, `correo`, `contrasena` (encriptada con bcrypt).
   - Generación y verificación de tokens JWT.
   - Script Seeder para crear tablas e inicializar datos.

2. **Products Service (`backend/products-service`)**:
   - Puerto local: `4002`
   - Catálogo de productos: `id` (autonumérico), `nombreproducto`, `imagenproducto` (links URL), `precio`.
   - Consulta y creación de productos.

3. **Orders / Tax Service (`backend/orders-service`)**:
   - Puerto local: `4003`
   - Cálculo del subtotal, desglose de IVA (19% o configurable) y total final.

4. **API Gateway (`backend/gateway`)**:
   - Puerto local: `4000`
   - Enrutador unificado para la app cliente hacia los microservicios.

---

## 🗄️ Base de Datos & Seeder (Neon Database)

El seeder ya fue ejecutado y ha creado las tablas necesarias:
- `usuarios` (`id`, `nombre`, `correo`, `contrasena`, `created_at`)
- `productos` (`id`, `nombreproducto`, `imagenproducto`, `precio`, `created_at`)

**Usuario de prueba creado:**
- **Correo:** `admin@demo.com`
- **Contraseña:** `123456`

Si deseas volver a correr el seeder manualmente:
```bash
cd backend/auth-service
node seed.js
```

---

## 🚀 Cómo ejecutar en desarrollo local

Abre terminales separadas para correr cada servicio (o usa el gateway):

```bash
# Terminal 1: Auth Service
cd backend/auth-service
npm start

# Terminal 2: Products Service
cd backend/products-service
npm start

# Terminal 3: Orders Service
cd backend/orders-service
npm start

# Terminal 4: API Gateway
cd backend/gateway
npm start

# Terminal 5: Aplicación Expo
npx expo start
```

---

## ☁️ Cómo desplegar en Render

Se ha incluido el archivo [render.yaml](file:///c:/Users/Estudiantes/Downloads/CarritoCompra/render.yaml) listo para Blueprint de Render:

1. Entra a tu cuenta en [Render.com](https://render.com/).
2. Haz clic en **New +** y selecciona **Blueprint**.
3. Conecta el repositorio de tu proyecto.
4. Render leerá automáticamente el archivo `render.yaml` y creará los 4 servicios:
   - `carrito-gateway`
   - `carrito-auth-service`
   - `carrito-products-service`
   - `carrito-orders-service`
5. Las variables de entorno para conectar la base de datos Neon Database (`DATABASE_URL`) ya se encuentran preconfiguradas.
6. Una vez desplegado, copia la URL pública de `carrito-gateway` (ej. `https://carrito-gateway.onrender.com/api`) y actualízala en [AppContext.tsx](file:///c:/Users/Estudiantes/Downloads/CarritoCompra/src/context/AppContext.tsx#L5).
