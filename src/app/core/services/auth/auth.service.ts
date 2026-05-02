import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SystemRole, TenantWithApps, UserProfile } from '../../models';
import { SessionStorageService } from '../session-storage/session-storage.service';

export { SystemRole, TenantWithApps, UserProfile };

export interface SignInResponse {
  success: boolean;
  message: string;
  user: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    systemRole?: SystemRole;
  };
  accessToken: string;
  refreshToken: string;
}

export interface LoginV2Request {
  email?: string;
  nuid?: string;
  password: string;
  appId: string;
  tenantId: string;
}

export interface Address {
  id: string;
  country: string;
  province: string;
  city: string;
  detail: string;
  postalCode?: string;
}

export interface AuthorizeResponse {
  success: boolean;
  authCode: string;
  redirectUri: string;
  signedPayload?: string;
}

export interface LoginV2Response {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    systemRole: SystemRole;
  };
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

export interface AuthorizeV2Response {
  success: boolean;
  code: string;
  expiresIn: number;
  redirectUri: string;
  state?: string;
  signedPayload?: string;
}

export interface ExchangeV2Response {
  success: boolean;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  user: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  tenant: {
    tenantId: string;
    name: string;
    slug: string;
    role: string;
  };
}

export interface RefreshV2Response {
  success: boolean;
  tokens: {
    accessToken: string;
    expiresIn: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  baseUrl = environment.baseUrl;

  private get v2BaseUrl(): string {
    return `${this.baseUrl}/api/v2/auth`;
  }

  constructor(
    private readonly http: HttpClient,
    private readonly sessionStorageService: SessionStorageService,
  ) { }

  /**
   * @deprecated Use loginV2() instead. v1 signin will be removed on 2026-05-01
   */
  signIn(emailOrNuid: string, password: string): Observable<SignInResponse> {
    const isEmail = emailOrNuid.includes('@');
    const payload = isEmail
      ? { email: emailOrNuid, password }
      : { nuid: emailOrNuid, password };

    return this.http.post<SignInResponse>(
      `${this.baseUrl}/api/v1/auth/signin`,
      payload,
      { withCredentials: true },
    );
  }

  signUp(values: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/v1/auth/signup`, values, {
      withCredentials: true,
    });
  }

  getProfile(): Observable<{ success: boolean; user: UserProfile }> {
    return this.http.get<{ success: boolean; user: UserProfile }>(
      `${this.baseUrl}/api/v2/user/profile`,
      { withCredentials: true },
    );
  }

  updateProfile(
    profileData: Partial<UserProfile>,
  ): Observable<{ success: boolean; message: string; user: UserProfile }> {
    return this.http.put<{
      success: boolean;
      message: string;
      user: UserProfile;
    }>(`${this.baseUrl}/api/v1/user/profile`, profileData, {
      withCredentials: true,
    });
  }

  getUserTenants(): Observable<{
    success: boolean;
    tenants: TenantWithApps[];
  }> {
    return this.http.get<{ success: boolean; tenants: TenantWithApps[] }>(
      `${this.baseUrl}/api/v1/user/tenants`,
      { withCredentials: true },
    );
  }

  authorize(
    tenantId: string,
    appId: string,
    redirectUri: string,
    pkce?: {
      codeChallenge?: string;
      codeChallengeMethod?: string;
      state?: string;
      nonce?: string;
    },
  ): Observable<AuthorizeResponse> {
    return this.http.post<AuthorizeResponse>(
      `${this.baseUrl}/api/v1/auth/authorize`,
      { tenantId, appId, redirectUri, ...pkce },
      { withCredentials: true },
    );
  }

  /**
   * @deprecated Use logoutV2() instead. v1 logout will be removed on 2026-05-01
   */
  logout(): Observable<any> {
    return this.http
      .post(`${this.baseUrl}/api/v1/auth/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          this.sessionStorageService.clearAll();
        }),
      );
  }

  sendEmailRecovery(nit: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/v1/auth/forgot-password`,
      { nit },
      { withCredentials: true },
    );
  }

  validateEmailRecovery(password: string, otp: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/v1/auth/reset-password`,
      { password, otp },
      { withCredentials: true },
    );
  }

  sendEmailOtpCode(email: string, userId: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/v1/email-verification/send`,
      { email, userId },
      { withCredentials: true },
    );
  }

  verifyEmailToken(token: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/v1/email-verification/verify`,
      { token },
      { withCredentials: true },
    );
  }

  generateOTP(userId: string, name: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/v1/otp/generate`,
      { userId, name },
      { withCredentials: true },
    );
  }

  verifyOTP(userId: string, token: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/v1/otp/verify`,
      { userId, token },
      { withCredentials: true },
    );
  }

  validateOTP(tempToken: string, token: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/v1/otp/validate`,
      { tempToken, token },
      { withCredentials: true },
    );
  }

  checkOTPStatus(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/v1/otp/status/${userId}`, {
      withCredentials: true,
    });
  }

  // ============================================================
  // V2 API Methods (Redis-backed, JWT Bearer + PKCE)
  // ============================================================

  /**
   * Login con email o NUID + password
   * Guarda el token en sessionStorage para el interceptor
   */
  loginV2(
    emailOrNuid: string,
    password: string,
    appId: string = environment.appId || 'sso-portal',
    tenantId: string = environment.tenantId || 'tenant-default',
  ): Observable<LoginV2Response> {
    const isEmail = emailOrNuid.includes('@');
    const payload: LoginV2Request = {
      ...(isEmail ? { email: emailOrNuid } : { nuid: emailOrNuid }),
      password,
      appId,
      tenantId,
    };

    return this.http.post<LoginV2Response>(
      `${this.v2BaseUrl}/login`,
      payload,
    ).pipe(
      tap((response) => {
        if (response.accessToken) {
          this.sessionStorageService.saveV2AccessToken(response.accessToken);
          this.sessionStorageService.setV2AuthMode(true);
        }
      }),
    );
  }

  /**
   * @deprecated El flujo redirect (launchApp) será eliminado en favor del flujo iframe.
   * Las apps satélites usarán @bigso/auth-sdk/browser para autenticación.
   */
  authorizeV2(
    tenantId: string,
    appId: string,
    redirectUri: string,
    codeChallenge: string,
    codeChallengeMethod: string = 'S256',
    codeVerifier?: string,
    state?: string,
    nonce?: string,
  ): Observable<AuthorizeV2Response> {
    return this.http.post<AuthorizeV2Response>(
      `${this.v2BaseUrl}/authorize`,
      { tenantId, appId, redirectUri, codeChallenge, codeChallengeMethod, codeVerifier, state, nonce },
      { withCredentials: true },
    );
  }

  exchangeV2(
    code: string,
    appId: string,
    codeVerifier: string,
  ): Observable<ExchangeV2Response> {
    return this.http.post<ExchangeV2Response>(
      `${this.v2BaseUrl}/exchange`,
      { code, appId, codeVerifier },
      { withCredentials: true },
    );
  }

  refreshV2(): Observable<RefreshV2Response> {
    return this.http.post<RefreshV2Response>(
      `${this.v2BaseUrl}/refresh`,
      {},
      { withCredentials: true },
    );
  }

  /**
   * Logout v2 con Bearer token
   * Limpia sessionStorage y revoca sesión en SSO
   */
  logoutV2(revokeAll: boolean = false): Observable<any> {
    const accessToken = this.sessionStorageService.getV2AccessToken();

    return this.http.post(
      `${this.v2BaseUrl}/logout`,
      { revokeAll },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    ).pipe(
      tap(() => {
        this.sessionStorageService.clearAll();
      }),
    );
  }
}
