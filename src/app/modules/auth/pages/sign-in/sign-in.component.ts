import { NgClass, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
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
      this.appId = params['app_id'] || '';
      this.tenantId = params['tenant_id'] || '';
      this.isEmbedded = params['embedded'] === 'true';

      console.log(`[SignIn] Query Params -> redirectUri: ${this.redirectUri}, appId: ${this.appId}, tenantId: ${this.tenantId}`);

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

    this.authService.signIn(nit, password).subscribe(
      (response: any) => {
        // Check if 2FA is required
        if (response.requiresTwoFactor) {
          this.isSubmitting = false;
          // Redirect to 2FA validation page with tempToken
          this.router.navigate(['/auth/two-steps'], {
            queryParams: {
              token: response.tempToken,
              validate: 'true',
              ...(this.redirectUri && { redirect_uri: this.redirectUri }),
              ...(this.appId && { app_id: this.appId }),
              ...(this.tenantId && { tenant_id: this.tenantId }),
              ...(this.isEmbedded && { embedded: 'true' })
            }
          });
          return;
        }

        // SSO cookie already set by backend
        // No need to save tokens in sessionStorage anymore

        // Remember me functionality (optional)
        if (this.form.controls['remember'].value) {
          this.localStorageService.setRememberLoginCredentials({
            nit,
            password,
          });
        }

        // Post-login redirect based on mode
        this.handlePostLoginRedirect();
      },
      (error) => {
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
    if (this.loginMode === 'app-initiated') {
      // App-initiated flow
      if (this.tenantId) {
        console.log(`[SignIn] Tenant ID present (${this.tenantId}), bypassing selector. Authorizing...`);
        // Tenant already specified, generate auth code directly
        this.authService.authorize(this.tenantId, this.appId, this.redirectUri).subscribe({
          next: (response) => {
            console.log(`[SignIn] Authorization success. Redirecting to:`, response.redirectUri);
            if (this.isEmbedded) {
              try {
                // Extraer el 'code' de la url de respuesta
                const urlObj = new URL(response.redirectUri);
                const code = urlObj.searchParams.get('code');
                if (code) {
                  const codeBase64 = btoa(code);
                  console.log(`[SignIn] Embedded mode: sending sso-success via postMessage`);
                  window.parent.postMessage({
                    v: "1.0",
                    source: "@bigso/sso-iframe",
                    type: "sso-success",
                    payload: { codeBase64 }
                  }, "*"); // Emite a cualquier origin (la app padre lo valida)
                } else {
                  console.error("[SignIn] No auth code found in redirectUrl for embedded mode.");
                }
              } catch (e) {
                console.error("[SignIn] Error parsing redirectUri for embedded mode", e);
              }
            } else {
              window.location.href = response.redirectUri;
            }
          },
          error: (err) => {
            console.error('[SignIn] Error authorizing:', err);
            toast.error('Error al autorizar acceso', {
              position: 'bottom-right'
            });
          }
        });
      } else {
        console.log(`[SignIn] Navigating to tenant-selector with app_id=${this.appId}, redirect_uri=${this.redirectUri}`);
        // Go to tenant selector
        this.router.navigate(['/dashboard/select-tenant'], {
          queryParams: {
            redirect_uri: this.redirectUri,
            app_id: this.appId,
            ...(this.isEmbedded && { embedded: 'true' })
          }
        });
      }
    } else {
      // Direct login - go to returnUrl or SSO dashboard
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
      console.log(`[SignIn] Direct login logic. Navigating to returnUrl:`, returnUrl);
      this.router.navigateByUrl(returnUrl);
    }
  }
  toggleRememberButton() {
    // Function removed because remember toggle is handled by form valueChanges
  }
}
