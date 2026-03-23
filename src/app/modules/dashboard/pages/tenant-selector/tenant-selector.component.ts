import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/app/core/services/user/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AuthService,
  TenantWithApps,
} from 'src/app/core/services/auth/auth.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-tenant-selector',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tenant-selector.component.html',
  styleUrls: ['./tenant-selector.component.scss'],
})
export class TenantSelectorComponent implements OnInit {
  tenants: TenantWithApps[] = [];
  redirectUri: string = '';
  appId: string = '';
  isEmbedded: boolean = false;
  loading = true;
  selecting = false;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit() {
    console.log('[TenantSelector] ngOnInit invoked');
    // Get query params
    this.redirectUri = this.route.snapshot.queryParams['redirect_uri'] || '';
    this.appId = this.route.snapshot.queryParams['app_id'] || '';
    this.isEmbedded = this.route.snapshot.queryParams['embedded'] === 'true';

    console.log(`[TenantSelector] Query params -> redirectUri: ${this.redirectUri}, appId: ${this.appId}`);

    if (!this.redirectUri || !this.appId) {
      console.log('[TenantSelector] Missing redirectUri or appId, navigating to /dashboard');
      // If no redirect params, go to dashboard
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadTenants();
  }

  loadTenants() {
    console.log('[TenantSelector] Calling userService.getUserTenants()');
    this.userService.getUserTenants().subscribe({
      next: (response) => {
        console.log('[TenantSelector] Response from getUserTenants:', response);
        // Filter tenants by app access
        if (this.appId) {
          this.tenants = response.tenants.filter((t) =>
            t.apps.some((app) => app.appId === this.appId),
          );
          console.log(`[TenantSelector] Filtered tenants for appId ${this.appId}:`, this.tenants);
        } else {
          this.tenants = response.tenants;
          console.log('[TenantSelector] All tenants (no appId filter):', this.tenants);
        }

        this.loading = false;

        // Auto-select if only one tenant
        if (this.tenants.length === 1) {
          console.log('[TenantSelector] Only 1 tenant found, auto-selecting:', this.tenants[0].tenantId);
          this.selectTenant(this.tenants[0].tenantId);
        } else if (this.tenants.length === 0) {
          console.warn('[TenantSelector] No tenants found with access to this app. Redirecting to /dashboard');
          alert('No tienes acceso a esta aplicación');
          this.router.navigate(['/dashboard']);
        } else {
          console.log('[TenantSelector] Multiple tenants found, waiting for user selection.');
        }
      },
      error: (err) => {
        console.error('Error loading tenants:', err);
        this.loading = false;
        alert('Error al cargar organizaciones');
      },
    });
  }

  selectTenant(tenantId: string) {
    if (this.selecting) return;

    this.selecting = true;
    console.log(`[TenantSelector] Authorizing for tenantId: ${tenantId}, appId: ${this.appId}, redirectUri: ${this.redirectUri}`);

    // Read PKCE context if available (v2.3, set by sign-in)
    const pkceRaw = sessionStorage.getItem('sso_pkce_ctx');
    let pkce: any = undefined;
    if (pkceRaw) {
      const pkceCtx = JSON.parse(pkceRaw);
      pkce = {
        codeChallenge: pkceCtx.codeChallenge,
        codeChallengeMethod: pkceCtx.codeChallengeMethod,
        state: pkceCtx.state,
        nonce: pkceCtx.nonce,
      };
    }

    this.authService
      .authorize(tenantId, this.appId, this.redirectUri, pkce)
      .subscribe({
        next: (response) => {
          console.log(`[TenantSelector] Authorization success, redirecting to: ${response.redirectUri}`);
          // Redirect to app with auth code or postMessage if embedded
          if (this.isEmbedded) {
            try {
              if (pkceRaw && response.signedPayload) {
                // v2.3: Send real signed JWS from SSO Core
                const pkceCtx = JSON.parse(pkceRaw);
                console.log(`[TenantSelector] Embedded mode: sending sso-success v2.3`);
                const targetOrigin = pkceCtx.origin || '*';
                window.parent.postMessage({
                  v: '2.3',
                  source: '@bigso/sso-iframe',
                  type: 'sso-success',
                  requestId: pkceCtx.requestId,
                  payload: {
                    state: pkceCtx.state,
                    signed_payload: response.signedPayload,
                  }
                }, targetOrigin);
                sessionStorage.removeItem('sso_pkce_ctx');
              } else {
                // v1.0 legacy
                const urlObj = new URL(response.redirectUri);
                const code = urlObj.searchParams.get('code');
                if (code) {
                  const codeBase64 = btoa(code);
                  console.log(`[TenantSelector] Embedded mode: sending sso-success v1.0`);
                  window.parent.postMessage({
                    v: '1.0',
                    source: '@bigso/sso-iframe',
                    type: 'sso-success',
                    payload: { codeBase64 }
                  }, '*');
                } else {
                  console.error("[TenantSelector] No auth code found in redirectUrl for embedded mode.");
                }
              }
            } catch (e) {
              console.error("[TenantSelector] Error in embedded success", e);
            }
          } else {
            window.location.href = response.redirectUri;
          }
        },
        error: (err) => {
          console.error('Error authorizing:', err);
          this.selecting = false;
          alert('Error al autorizar acceso');
        },
      });
  }
}
