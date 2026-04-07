import { NgClass, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { Observable } from 'rxjs';
import { toast } from 'ngx-sonner';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { LoadingService } from 'src/app/core/services/loading/loading.service';
import { LocalStorageService } from 'src/app/core/services/local-storage/local-storage.service';
import { SessionStorageService } from 'src/app/core/services/session-storage/session-storage.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    AngularSvgIconModule,
    NgClass,
    NgIf,
    ButtonComponent,
  ],
  providers: [AuthService],
})
export class SignInComponent implements OnInit {
  form!: FormGroup;
  submitted = false;
  passwordTextType!: boolean;
  isSubmitting = false;

  // SSO Dual Mode
  loginMode: 'direct' | 'app-initiated' = 'direct';
  redirectUri: string = '';
  appId: string = '';
  tenantId: string = '';
  appName: string = '';
  isEmbedded: boolean = false;

  // v2.3 PKCE context (populated by sso-init message from SDK)
  private pkceContext: {
    state?: string;
    nonce?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    origin?: string;
    requestId?: string;
  } = {};
  private protocolVersion = '1.0';

  constructor(
    private readonly _formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly localStorageService: LocalStorageService,
    private readonly sessionStorageService: SessionStorageService,
    public loadingService: LoadingService,
  ) {
    this.form = this._formBuilder.group({
      nit: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      remember: [''],
    });

    this.form.controls['remember'].valueChanges.subscribe((value) => {
      if (!value) {
        this.localStorageService.removeRememberLoginCredentials();
      }
    });
  }

  ngOnInit(): void {
    // Remember me functionality (Priority 1 - Default)
    const rememberLoginCredentials =
      this.localStorageService.getRememberLoginCredentials();
    if (rememberLoginCredentials) {
      this.form.patchValue({
        nit: rememberLoginCredentials.nit,
        password: rememberLoginCredentials.password,
        remember: true,
      });
    }

    // Detect SSO mode from query params (Priority 2 - Overrides)
    this.route.queryParams.subscribe((params) => {
      this.redirectUri = params['redirect_uri'] || '';
      this.appId = params['app_id'] || params['client_id'] || '';
      this.tenantId = params['tenant_id'] || '';
      // v2.3: detect embedded via iframe context (v + client_id in URL)
      // v1.0 fallback: explicit embedded=true param
      this.isEmbedded = params['embedded'] === 'true'
        || (params['v'] === '2.3' && !!params['client_id'] && window !== window.parent);

      console.log(`[SignIn] Query Params -> redirectUri: ${this.redirectUri}, appId: ${this.appId}, tenantId: ${this.tenantId}, isEmbedded: ${this.isEmbedded}`);

      // If redirected by guard, extract from returnUrl
      const returnUrl = params['returnUrl'];
      if (returnUrl) {
        console.log(`[SignIn] Found returnUrl:`, returnUrl);
        try {
          const urlTree = this.router.parseUrl(returnUrl);
          this.redirectUri = this.redirectUri || urlTree.queryParams['redirect_uri'] || '';
          this.appId = this.appId || urlTree.queryParams['app_id'] || '';
          this.tenantId = this.tenantId || urlTree.queryParams['tenant_id'] || '';
          console.log(`[SignIn] Extracted from returnUrl -> redirectUri: ${this.redirectUri}, appId: ${this.appId}, tenantId: ${this.tenantId}`);
        } catch (e) {
          console.error('[SignIn] Error parsing returnUrl', e);
        }
      }

      // Determine login mode
      if (this.redirectUri && this.appId) {
        this.loginMode = 'app-initiated';
        this.appName = this.getAppName(this.appId);
        console.log(`[SignIn] Login Mode detected: app-initiated for ${this.appName}`);
      } else {
        console.log(`[SignIn] Login Mode detected: direct`);
      }

      // Auto-fill nit if provided (This overrides remember me)
      const nit = params['nit'];
      if (nit) {
        // Only override if the nit from URL is different from remembered, 
        // or just always override and clear password to be safe
        setTimeout(() => {
          this.form.patchValue({
            nit: nit,
            password: '' // Clear password if nit comes from URL because it might be a different user
          });
          this.form.updateValueAndValidity();
        }, 0);
      }
    });

    // v2.3: Setup postMessage listener and emit sso-ready if embedded
    if (this.isEmbedded) {
      this.setupPostMessageListener();
      this.emitSsoReady();
    }
  }

  /**
   * v2.3: Emit sso-ready to parent window (SDK)
   */
  private emitSsoReady() {
    console.log('[SignIn] Emitting sso-ready to parent');
    window.parent.postMessage({
      v: '2.3',
      source: '@bigso/sso-iframe',
      type: 'sso-ready',
    }, '*');
  }

  /**
   * v2.3: Listen for sso-init from SDK to capture PKCE params
   */
  private setupPostMessageListener() {
    window.addEventListener('message', (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      // Only process messages from the SDK
      if (msg.source !== '@app/widget') return;

      if (msg.type === 'sso-init' && msg.v === '2.3') {
        console.log('[SignIn] sso-init received (v2.3)', msg.payload);
        this.protocolVersion = '2.3';
        this.pkceContext = {
          state: msg.payload?.state,
          nonce: msg.payload?.nonce,
          codeChallenge: msg.payload?.code_challenge,
          codeChallengeMethod: msg.payload?.code_challenge_method,
          origin: msg.payload?.origin,
          requestId: msg.requestId,
        };

        // Force app-initiated mode: the SDK is driving the flow
        this.loginMode = 'app-initiated';
        // Derive redirectUri from sso-init payload if not already set
        if (!this.redirectUri) {
          this.redirectUri = msg.payload?.redirect_uri || msg.payload?.origin || '';
        }
        this.appName = this.getAppName(this.appId);
        console.log(`[SignIn] Forced app-initiated mode. redirectUri: ${this.redirectUri}, appId: ${this.appId}`);
      }
    });
  }

  getAppName(appId: string): string {
    const appNames: Record<string, string> = {
      'admin': 'Panel Admin',
      'crm': 'CRM',
      'hr': 'Recursos Humanos',
      'analytics': 'Analytics'
    };
    return appNames[appId] || appId;
  }

  get f() {
    return this.form.controls;
  }

  togglePasswordTextType() {
    this.passwordTextType = !this.passwordTextType;
  }

  onSubmit() {
    this.submitted = true;
    this.isSubmitting = true;
    const { nit, password } = this.form.value;

    const useV2 = environment.useV2Auth;

    const loginObs: Observable<any> = useV2
      ? this.authService.loginV2(nit, password)
      : this.authService.signIn(nit, password);

    loginObs.subscribe(
      (response: any) => {
        // Check if 2FA is required
        if (response.requiresTwoFactor) {
          this.isSubmitting = false;
          this.router.navigate(['/auth/two-steps'], {
            queryParams: {
              token: response.tempToken,
              validate: 'true',
              ...(this.redirectUri && { redirect_uri: this.redirectUri }),
              ...(this.appId && { app_id: this.appId }),
              ...(this.tenantId && { tenant_id: this.tenantId }),
              ...(this.isEmbedded && { embedded: 'true' }),
              ...(useV2 && { v2: 'true' }),
            }
          });
          return;
        }

        if (useV2 && response.tokens?.accessToken) {
          this.sessionStorageService.saveV2AccessToken(response.tokens.accessToken);
          this.sessionStorageService.setV2AuthMode(true);
        }

        // Remember me functionality (optional)
        if (this.form.controls['remember'].value) {
          this.localStorageService.setRememberLoginCredentials({
            nit,
            password,
          });
        }

        this.handlePostLoginRedirect();
      },
      (error: any) => {
        this.isSubmitting = false;
        console.log('Error signIn:', error);

        // Cuenta no activa → redirigir a verificación de email
        if (error?.error === 'ACCOUNT_NOT_ACTIVE') {
          const encodedUserId = error?.errors?.[0]?.userId;
          if (encodedUserId) {
            this.loadingService.loading = true;
            this.router.navigate(['/auth/email-verification'], {
              queryParams: { userId: encodedUserId, email: nit },
            });
          } else {
            toast.error('Cuenta no activa', {
              position: 'bottom-right',
              description: 'Tu cuenta aún no ha sido activada. Verifica tu correo electrónico.',
            });
          }
          return;
        }

        // Credenciales inválidas
        if (error?.error === 'INVALID_CREDENTIALS') {
          this.form.controls['password'].setErrors({ invalid: true });
          toast.error('Credenciales incorrectas', {
            position: 'bottom-right',
            description: 'El correo o la contraseña no coinciden. Intenta de nuevo.',
          });
          return;
        }

        // Validación fallida (campos inválidos)
        if (error?.error === 'INVALID_INPUT') {
          toast.error('Datos inválidos', {
            position: 'bottom-right',
            description: 'Verifica que los datos ingresados sean correctos.',
          });
          return;
        }

        // Límite de intentos alcanzado
        if (error?.status === 429) {
          toast.error('Demasiados intentos', {
            position: 'bottom-right',
            description: 'Has superado el límite de intentos. Espera unos minutos antes de intentar de nuevo.',
          });
          return;
        }

        // Error de conexión / red
        if (error?.status === 0) {
          toast.error('Error de conexión', {
            position: 'bottom-right',
            description: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
          });
          return;
        }

        // Error del servidor (500+)
        if (error?.status >= 500) {
          toast.error('Error del servidor', {
            position: 'bottom-right',
            description: 'Ocurrió un error inesperado. Intenta más tarde.',
          });
          return;
        }

        // Fallback genérico
        toast.error('Error al iniciar sesión', {
          position: 'bottom-right',
          description: error?.message || 'Ocurrió un error inesperado. Intenta de nuevo.',
        });
      },
    );
  }

  handlePostLoginRedirect() {
    console.log(`[SignIn] handlePostLoginRedirect called. Mode: ${this.loginMode}`);
    const useV2 = environment.useV2Auth;

    if (this.loginMode === 'app-initiated') {
      if (this.tenantId) {
        console.log(`[SignIn] Tenant ID present (${this.tenantId}), bypassing selector. Authorizing...`);

        if (useV2 && this.pkceContext.codeChallenge) {
          this.authService.authorizeV2(
            this.tenantId,
            this.appId,
            this.redirectUri,
            this.pkceContext.codeChallenge || '',
            this.pkceContext.codeChallengeMethod || 'S256',
            this.pkceContext.state,
            this.pkceContext.nonce,
          ).subscribe({
            next: (response) => {
              console.log(`[SignIn] V2 Authorization success. Code:`, response.code);
              const redirectUrl = `${this.redirectUri}?code=${response.code}${response.state ? '&state=' + response.state : ''}`;
              if (this.isEmbedded) {
                this.sendEmbeddedSuccess(response);
              } else {
                window.location.href = redirectUrl;
              }
            },
            error: (err) => {
              console.error('[SignIn] Error authorizing (v2):', err);
              toast.error('Error al autorizar acceso', { position: 'bottom-right' });
            }
          });
        } else {
          const pkce = this.protocolVersion === '2.3' ? {
            codeChallenge: this.pkceContext.codeChallenge,
            codeChallengeMethod: this.pkceContext.codeChallengeMethod,
            state: this.pkceContext.state,
            nonce: this.pkceContext.nonce,
          } : undefined;

          this.authService.authorize(this.tenantId, this.appId, this.redirectUri, pkce).subscribe({
            next: (response) => {
              console.log(`[SignIn] Authorization success. Redirecting to:`, response.redirectUri);
              if (this.isEmbedded) {
                this.sendEmbeddedSuccess(response);
              } else {
                window.location.href = response.redirectUri;
              }
            },
            error: (err) => {
              console.error('[SignIn] Error authorizing:', err);
              toast.error('Error al autorizar acceso', { position: 'bottom-right' });
            }
          });
        }
      } else {
        console.log(`[SignIn] Navigating to tenant-selector with app_id=${this.appId}, redirect_uri=${this.redirectUri}`);
        if (this.protocolVersion === '2.3') {
          sessionStorage.setItem('sso_pkce_ctx', JSON.stringify(this.pkceContext));
        }
        this.router.navigate(['/dashboard/select-tenant'], {
          queryParams: {
            redirect_uri: this.redirectUri,
            app_id: this.appId,
            ...(this.isEmbedded && { embedded: 'true' })
          }
        });
      }
    } else {
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
      console.log(`[SignIn] Direct login logic. Navigating to returnUrl:`, returnUrl);
      this.router.navigateByUrl(returnUrl);
    }
  }

  /**
   * Send embedded success via postMessage.
   * Supports both v1.0 (codeBase64) and v2.3 (signedPayload JWS) protocols.
   */
  private sendEmbeddedSuccess(response: any) {
    try {
      if (this.protocolVersion === '2.3' && response.signedPayload) {
        // v2.3: Send signed JWS payload from SSO Core
        console.log('[SignIn] Embedded mode: sending sso-success v2.3 with signedPayload');
        const targetOrigin = this.pkceContext.origin || '*';
        window.parent.postMessage({
          v: '2.3',
          source: '@bigso/sso-iframe',
          type: 'sso-success',
          requestId: this.pkceContext.requestId,
          payload: {
            state: this.pkceContext.state,
            signed_payload: response.signedPayload,
          }
        }, targetOrigin);
      } else {
        // v1.0 legacy: Send Base64 encoded code
        const urlObj = new URL(response.redirectUri);
        const code = urlObj.searchParams.get('code');
        if (!code) {
          console.error('[SignIn] No auth code found in redirectUrl for embedded mode.');
          return;
        }
        const codeBase64 = btoa(code);
        console.log('[SignIn] Embedded mode: sending sso-success v1.0');
        window.parent.postMessage({
          v: '1.0',
          source: '@bigso/sso-iframe',
          type: 'sso-success',
          payload: { codeBase64 }
        }, '*');
      }
    } catch (e) {
      console.error('[SignIn] Error in sendEmbeddedSuccess', e);
    }
  }

  toggleRememberButton() {
    // Function removed because remember toggle is handled by form valueChanges
  }
}

