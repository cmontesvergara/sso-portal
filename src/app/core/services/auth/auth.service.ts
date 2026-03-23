import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SystemRole, TenantWithApps, UserProfile } from '../../models';

// Re-export for backwards compatibility
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
  signedPayload?: string; // v2.3: JWS signed payload (only when PKCE params were sent)
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  baseUrl = environment.baseUrl;
  constructor(private readonly http: HttpClient) {}

  /**
   * Sign in - creates SSO session cookie
   */
  signIn(emailOrNuid: string, password: string): Observable<SignInResponse> {
    // Detect if it's an email or nuid
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

  /**
   * Sign up new user
   */
  signUp(values: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/v1/auth/signup`, values, {
      withCredentials: true,
    });
  }

  /**
   * Get current user profile (authenticated with SSO cookie)
   */
  getProfile(): Observable<{ success: boolean; user: UserProfile }> {
    return this.http.get<{ success: boolean; user: UserProfile }>(
      `${this.baseUrl}/api/v1/user/profile`,
      { withCredentials: true },
    );
  }

  /**
   * Update current user profile (authenticated with SSO cookie)
   */
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

  /**
   * Get user tenants with apps
   */
  getUserTenants(): Observable<{
    success: boolean;
    tenants: TenantWithApps[];
  }> {
    return this.http.get<{ success: boolean; tenants: TenantWithApps[] }>(
      `${this.baseUrl}/api/v1/user/tenants`,
      { withCredentials: true },
    );
  }

  /**
   * Generate authorization code for app access
   */
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
   * Logout - clears SSO session
   */
  logout(): Observable<any> {
    return this.http
      .post(`${this.baseUrl}/api/v1/auth/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          // Cookie cleared by backend
        }),
      );
  }

  /**
   * Password recovery
   */
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

  /**
   * Email verification
   */
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

  /**
   * 2FA/TOTP methods
   */
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
}
