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

  // SSO Dual Mode
  loginMode: 'direct' | 'app-initiated' = 'direct';
  redirectUri: string = '';
  appId: string = '';
  tenantId: string = '';
  appName: string = '';

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
        this.form.reset();
        this.localStorageService.removeRememberLoginCredentials();
      }
    });
  }

  ngOnInit(): void {
    // Detect SSO mode from query params
    this.route.queryParams.subscribe((params) => {
      this.redirectUri = params['redirect_uri'] || '';
      this.appId = params['app_id'] || '';
      this.tenantId = params['tenant_id'] || '';

      // If redirected by guard, extract from returnUrl
      const returnUrl = params['returnUrl'];
      if (returnUrl) {
        try {
          const urlTree = this.router.parseUrl(returnUrl);
          this.redirectUri = this.redirectUri || urlTree.queryParams['redirect_uri'] || '';
          this.appId = this.appId || urlTree.queryParams['app_id'] || '';
          this.tenantId = this.tenantId || urlTree.queryParams['tenant_id'] || '';
        } catch (e) {
          console.error('Error parsing returnUrl', e);
        }
      }

      // Determine login mode
      if (this.redirectUri && this.appId) {
        this.loginMode = 'app-initiated';
        this.appName = this.getAppName(this.appId);
      }

      // Auto-fill nit if provided
      const nit = params['nit'];
      if (nit) {
        this.form.patchValue({ nit });
      }
    });

    // Remember me functionality
    const rememberLoginCredentials =
      this.localStorageService.getRememberLoginCredentials();
    if (rememberLoginCredentials) {
      this.form.patchValue({
        nit: rememberLoginCredentials.nit,
        password: rememberLoginCredentials.password,
        remember: true,
      });
    }
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
    const { nit, password } = this.form.value;

    this.authService.signIn(nit, password).subscribe(
      (response: any) => {
        // Check if 2FA is required
        if (response.requiresTwoFactor) {
          // Redirect to 2FA validation page with tempToken
          this.router.navigate(['/auth/two-steps'], {
            queryParams: {
              token: response.tempToken,
              validate: 'true',
              // Preserve SSO params for after 2FA
              ...(this.redirectUri && { redirect_uri: this.redirectUri }),
              ...(this.appId && { app_id: this.appId }),
              ...(this.tenantId && { tenant_id: this.tenantId })
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
        if (error?.code === 401 && error?.resultCode === 'UNAUTHORIZED') {
          this.form.controls['password'].setErrors({ invalid: true });

          toast.error('Valida tus credenciales.', {
            position: 'bottom-right',
            description: 'Parece que tus credenciales no coinciden.',
          });
        }
        console.log('Error signIn:', error);
        if (error?.error === 'ACCOUNT_NOT_ACTIVE') {
          // Extract encoded userId from error details if available
          const encodedUserId = error?.errors?.[0]?.userId;

          if (encodedUserId) {
            this.loadingService.loading = true;
            // Redirect to email verification with userId as query param
            this.router.navigate(['/auth/email-verification'], {
              queryParams: { userId: encodedUserId },
            });
          }
        }

      },
    );
  }

  handlePostLoginRedirect() {
    if (this.loginMode === 'app-initiated') {
      // App-initiated flow
      if (this.tenantId) {
        // Tenant already specified, generate auth code directly
        this.authService.authorize(this.tenantId, this.appId, this.redirectUri).subscribe({
          next: (response) => {
            window.location.href = response.redirectUri;
          },
          error: (err) => {
            console.error('Error authorizing:', err);
            toast.error('Error al autorizar acceso', {
              position: 'bottom-right'
            });
          }
        });
      } else {
        // Go to tenant selector
        this.router.navigate(['/dashboard/select-tenant'], {
          queryParams: {
            redirect_uri: this.redirectUri,
            app_id: this.appId
          }
        });
      }
    } else {
      // Direct login - go to returnUrl or SSO dashboard
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
      this.router.navigateByUrl(returnUrl);
    }
  }
  toggleRememberButton() {
    this.form.controls['remember'].patchValue(
      !this.form.controls['remember'].value,
    );
  }
}
