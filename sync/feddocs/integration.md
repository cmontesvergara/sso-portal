# Integration — SSO PORTAL

## Integración vía URL (App Initiated Flow)

SSO Portal actúa como el proveedor de identidad. Las aplicaciones externas (Clientes) deben redirigir a los usuarios al portal para iniciar el proceso de autenticación o autorización.

### Iniciar Flujo de Autorización
Para solicitar acceso a un tenant o aplicación específica, redirige al usuario a la siguiente URL:

#### `GET` `/dashboard/select-tenant`

Redirige al usuario al selector de tenants con el contexto de la aplicación que solicita acceso.

**Parámetros de URL (Query Params):**

| Parámetro | Requerido | Descripción | Ejemplo |
|---|---|---|---|
| `app_id` | ✅ | UUID de la aplicación cliente | `123e4567-e89b-12d3-a456-426614174000` |
| `redirect_uri` | ✅ | URL de retorno tras autenticación exitosa | `https://miapp.com/callback` |

**Ejemplo de integración (JavaScript):**

```javascript
/* 
  Ejemplo de cómo una App Cliente redirige al SSO 
  para iniciar sesión.
*/

const SSO_PORTAL_URL = 'https://sso.bigso.co';
const MY_APP_ID = 'b1804dc9-4cc6-4604-9477-8997337098b9';
const MY_CALLBACK = 'https://dashboard.miapp.com/auth/callback';

function loginWithBigso() {
  // 1. Construir parámetros
  const params = new URLSearchParams({
    app_id: MY_APP_ID,
    redirect_uri: MY_CALLBACK,
    response_type: 'code', // Opcional, por defecto implícito en el flujo
    scope: 'openid profile email' // Scopes solicitados
  });

  // 2. Redirigir al usuario
  window.location.href = `${SSO_PORTAL_URL}/dashboard/select-tenant?${params.toString()}`;
}
```

### Procesamiento del Callback
Una vez que el usuario se autentica y selecciona el tenant, el SSO Portal lo redirigirá de vuelta a tu `redirect_uri` con un código de autorización o token, dependiendo del flujo configurado.

La URL de retorno se verá así:
`https://dashboard.miapp.com/auth/callback?code=AUTH_CODE_HERE&state=...`

Tu aplicación debe:
1. Capturar el parámetro `code` de la URL.
2. Intercambiar este código por un `access_token` llamando directamente a la API del backend (`sso-core`).
3. Establecer la sesión del usuario en tu aplicación.

> **Nota de Seguridad:** Nunca expongas tu `client_secret` en el frontend si estás realizando el intercambio de código. Este paso debe hacerse idealmente desde tu backend (BFF pattern).


## SDKs y Librerías Cliente
Actualmente no existe un SDK oficial de JavaScript para integrar el SSO Portal directamente, ya que la integración se realiza principalmente a través de redirecciones estándar de navegador.

## Errores Comunes de Integración

| Problema | Causa | Solución |
|---|---|---|
| **Redirección a 404** | `app_id` incorrecto o no registrado | Verifica que el UUID de la aplicación exista en el registro del SSO Core. |
| **Bucle de redirecciones** | La `redirect_uri` no coincide con la configurada | Asegúrate de que la URL de callback esté en la lista blanca de la aplicación en el SSO. |
| **Usuario no logueado** | Sesión expirada o inexistente | El portal forzará el login si no detecta una sesión activa antes de procesar la solicitud `app_id`. |
