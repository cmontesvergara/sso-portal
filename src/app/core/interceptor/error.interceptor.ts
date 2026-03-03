import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { toast } from 'ngx-sonner';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SessionStorageService } from '../services/session-storage/session-storage.service';

/**
 * Estructura del error normalizado que reciben los componentes.
 *
 * Ejemplo de un error 401 del backend:
 * {
 *   status: 401,
 *   error: 'INVALID_CREDENTIALS',
 *   message: 'Invalid credentials',
 *   errors: [],
 *   timestamp: '...',
 * }
 */
export interface ApiError {
  /** HTTP status code (401, 403, 429, 500, etc.) */
  status: number;
  /** Código de error del backend (INVALID_CREDENTIALS, ACCOUNT_NOT_ACTIVE, etc.) */
  error: string;
  /** Mensaje legible del error */
  message: string;
  /** Detalles adicionales del error (array de objetos) */
  errors?: any[];
  /** Timestamp del error */
  timestamp?: string;
}

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private readonly router: Router,
    private readonly sessionStorageService: SessionStorageService,
  ) { }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((httpError: HttpErrorResponse | any) => {
        // --- Error del lado del cliente (red, CORS, etc.) ---
        if (httpError.error instanceof ErrorEvent) {
          const apiError: ApiError = {
            status: 0,
            error: 'NETWORK_ERROR',
            message: httpError.error.message || 'Error de conexión',
          };
          return throwError(() => apiError);
        }

        // --- Error del lado del servidor ---
        const body = httpError.error || {};

        // Construir error normalizado preservando status + body
        const apiError: ApiError = {
          status: httpError.status,
          error: body.error || 'UNKNOWN_ERROR',
          message: body.message || httpError.message || 'Error inesperado',
          errors: body.errors,
          timestamp: body.timestamp,
        };

        // === Errores globales (se manejan aquí, no en componentes) ===

        // JWT expirado → redirigir a login
        if (
          body.resultCode === 'UNAUTHORIZED' &&
          body.message?.includes('jwt expired')
        ) {
          toast.error('Sesión Expirada.', {
            position: 'bottom-right',
            description: 'Vuelva a iniciar sesión.',
          });
          const url = this.router.url;
          this.sessionStorageService.saveLastUrl(url);
          this.sessionStorageService.removeAccessToken();
          this.router.navigateByUrl('/auth/sign-in');
        }

        // Error genérico del servidor
        if (body.resultCode === 'DEFAULT_ERROR') {
          toast.error('Houston, tenemos problemas.', {
            position: 'bottom-right',
            description: 'Ocurrió un error, intente más tarde.',
            action: {
              label: 'Ir al inicio',
              onClick: () => this.router.navigate(['/']),
            },
            actionButtonStyle: 'background-color:#000000; color:white;',
          });
        }

        return throwError(() => apiError);
      }),
    );
  }
}
