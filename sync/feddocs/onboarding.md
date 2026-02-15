# Onboarding — SSO PORTAL

## ¿Qué es SSO PORTAL?
SSO Portal es el frontend oficial para el sistema de Single Sign-On de Bigso. Proporciona una interfaz moderna y centralizada para que los usuarios gestionen su identidad, accedan a aplicaciones empresariales y administren sus perfiles de seguridad.

Este proyecto consume las APIs del `sso-core` y ofrece una experiencia de usuario fluida utilizando Angular y TailwindCSS. Su objetivo es unificar el acceso a todas las herramientas de la compañía bajo una misma sesión segura.

## Prerequisitos
- **Node.js** ≥ 20.0.0
- **npm** ≥ 10.0.0
- **Docker** (opcional, para despliegue local similar a producción)
- Acceso al repositorio `sso-portal`
- Conectividad a la VPN para acceder a los servicios de backend en desarrollo o staging.

## Setup Local

### 1. Clonar el repositorio
```sh
git clone https://github.com/bigso/sso-portal.git
cd sso-portal
```

### 2. Instalar dependencias
```sh
npm install
```

### 3. Configurar variables de entorno
El proyecto utiliza archivos de entorno en `src/environments/`.
Para desarrollo local, verifica `src/environments/environment.ts`.

```sh
# No se requiere copia de .env, la configuración base está en:
# src/environments/environment.ts
```

Asegúrate de que `baseUrl` apunte a tu instancia local o de desarrollo del backend:
```typescript
export const environment = {
  production: false,
  baseUrl: 'http://localhost:3000' // Cambiar si el backend corre en otro puerto
};
```

### 4. Ejecutar
```sh
npm start
```
El servicio estará disponible en `http://localhost:4200`.

## Verificar que funciona
Para confirmar que la aplicación está corriendo correctamente:

1. Abre tu navegador en `http://localhost:4200`
2. Deberías ver la pantalla de Login del SSO.
3. Intenta hacer login con credenciales de prueba. Si el backend está conectado, deberías ser redirigido al Dashboard.

También puedes ejecutar los tests unitarios para verificar la integridad del código:
```sh
npm test
```

## Problemas Comunes

| Problema | Causa | Solución |
|---|---|---|
| `Error: connect ECONNREFUSED` | El backend no está corriendo en el puerto esperado | Verifica que `sso-core` esté levantado en el puerto configurado en `environment.ts` |
| Estilos rotos o Tailwind no carga | Problemas con el build de CSS | Ejecuta `npm rebuild` y reinicia el servidor de desarrollo |
| Error de CORS al conectar con API | El backend no admite el origen localhost:4200 | Configura los orígenes permitidos en el backend o usa un proxy local |

## Canales de Soporte

| Canal | Propósito |
|---|---|
| #core-team | Soporte general y consultas sobre el desarrollo del portal |
| #sso-alerts | Notificaciones automáticas de errores en producción |
