import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { SessionStorageService } from '../services/session-storage/session-storage.service';
import { AuthService } from '../services/auth/auth.service';

@Injectable()
export class AuthV2Interceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshSubject = new Subject<void>();

  constructor(
    private readonly router: Router,
    private readonly sessionStorageService: SessionStorageService,
    private readonly authService: AuthService,
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    const accessToken = this.sessionStorageService.getV2AccessToken();
    const isV2Mode = this.sessionStorageService.isV2AuthMode();

    let authReq = req;
    if (accessToken && isV2Mode && this.isSameOrigin(req)) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (
          error.status === 401 &&
          accessToken &&
          isV2Mode &&
          this.isSameOrigin(req) &&
          !req.url.includes('/auth/refresh') &&
          !req.url.includes('/auth/login')
        ) {
          return this.handle401Error(req, next);
        }

        return throwError(() => error);
      }),
    );
  }

  private isSameOrigin(req: HttpRequest<any>): boolean {
    return req.url.startsWith(environment.baseUrl);
  }

  private handle401Error(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    if (this.isRefreshing) {
      return this.refreshSubject.pipe(
        switchMap(() => {
          const newToken = this.sessionStorageService.getV2AccessToken();
          if (newToken) {
            return next.handle(
              req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` },
              }),
            );
          }
          this.redirectToLogin();
          return throwError(() => new Error('Session expired'));
        }),
      );
    }

    this.isRefreshing = true;
    this.refreshSubject = new Subject<void>();

    return this.authService.refreshV2().pipe(
      tap((response: any) => {
        this.isRefreshing = false;
        if (response?.tokens?.accessToken) {
          this.sessionStorageService.saveV2AccessToken(response.tokens.accessToken);
        }
        this.refreshSubject.next();
        this.refreshSubject.complete();
      }),
      switchMap(() => {
        const newToken = this.sessionStorageService.getV2AccessToken();
        return next.handle(
          req.clone({
            setHeaders: { Authorization: `Bearer ${newToken}` },
          }),
        );
      }),
      catchError((err) => {
        this.isRefreshing = false;
        this.refreshSubject.error(err);
        this.sessionStorageService.removeV2AccessToken();
        this.redirectToLogin();
        return throwError(() => err);
      }),
    );
  }

  private redirectToLogin(): void {
    this.sessionStorageService.removeV2AccessToken();
    this.router.navigateByUrl('/auth/sign-in');
  }
}