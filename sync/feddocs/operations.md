# Operations — SSO PORTAL

## Deploy

### Pipeline CI/CD
El despliegue se gestiona a través de CapRover, que escucha cambios en la rama principal y reconstruye la imagen Docker.

```mermaid
graph LR
    A[Push a main] --> B[GitHub Webhook]
    B --> C[CapRover Build]
    C --> D[Docker Build (Multi-stage)]
    D --> E[Deploy to Production]
```

### Deploy Manual
Si falla el webhook, se puede forzar un redespliegue desde la CLI de CapRover:

```sh
caprover deploy -n sso-portal
```

## Variables de Entorno
La configuración principal se inyecta en tiempo de construcción (`build time`) a través de los archivos de environment de Angular.

| Variable | Requerida | Descripción | Ejemplo |
|---|---|---|---|
| `production` | ✅ | Activa optimizaciones de Angular | `true` |
| `baseUrl` | ✅ | URL del backend sso-core | `https://back-sso.bigso.co` |

*Nota: Estas variables se configuran en `src/environments/environment.prod.ts` antes del build.*

## Monitoreo

| Métrica | Dashboard | Umbral de Alerta |
|---|---|---|
| Disponibilidad (Uptime) | CapRover Dashboard | < 99.9% |
| Errores JS (Sentry) | Sentry Project | > 5 eventos/hora |
| Tiempos de Carga | Google Analytics | > 2s LCP |


### Logs de Nginx
Como el frontend es servido por Nginx, los logs del contenedor son la primera fuente de verdad para problemas de enrutamiento o carga de assets.

Para ver los logs en vivo:
```sh
# Ver logs de acceso y errores de Nginx
caprover service logs sso-portal --lines 100 --follow
```

Busca patrones como:
- `404 Not Found` en archivos `.js` o `.css` (indica problemas de caché o build corrupto).
- `500 Internal Server Error` (raro en Nginx estático, podría indicar configuración corrupta).
- `403 Forbidden` (indica permisos de archivos incorrectos en la imagen Docker).

## Alertas


| Alerta | Severidad | Causa Probable | Acción |
|---|---|---|---|
| **Container Restart Loop** | Alta | Error en Nginx config o falta de memoria | Revisar logs de CapRover y aumentar RAM |
| **High 404 Rate** | Media | Deploy incompleto o caché agresiva | Invalidar CDN/Cloudflare cache |

## Rollback
En caso de un deploy defectuoso, usa CapRover para revertir a la imagen anterior.

1. Accede al panel de CapRover.
2. Ve a la app `sso-portal`.
3. En "Deployment History", busca la versión anterior exitosa.
4. Click en "Rollback".

Alternativamente vía CLI:
```sh
# No hay comando directo de rollback en CLI standard, usar UI
echo "Por favor usar la UI de CapRover para rollback seguro"
```

## Incidentes Comunes

| Incidente | Síntoma | Runbook |
|---|---|---|
| **Pantalla Blanca (WSOD)** | El usuario ve una pantalla en blanco al cargar | 1. Verificar consola del navegador por errores JS.<br>2. Verificar si falta algún chunk JS (error 404).<br>3. Purgar caché. |
| **Loop de Redirección** | El usuario vuelve al login constantemente | 1. Verificar cookies de sesión (dominio/seguridad).<br>2. Revisar logs del backend por errores de validación de sesión. |
