import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/app/core/services/user/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AuthService,
  TenantWithApps,
} from 'src/app/core/services/auth/auth.service';
import { RouterModule } from '@angular/router';
import { generateCodeVerifier, generateCodeChallenge } from 'src/app/core/utils/pkce';

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
    this.redirectUri = this.route.snapshot.queryParams['redirect_uri'] || '';
    this.appId = this.route.snapshot.queryParams['app_id'] || '';
    this.isEmbedded = this.route.snapshot.queryParams['embedded'] === 'true';

    console.log(`[TenantSelector] Query params -> redirectUri: ${this.redirectUri}, appId: ${this.appId}`);

    if (!this.redirectUri || !this.appId) {
      console.log('[TenantSelector] Missing redirectUri or appId, navigating to /dashboard');
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

  async selectTenant(tenantId: string) {
    if (this.selecting) return;

    this.selecting = true;
    console.log(`[TenantSelector] Authorizing for tenantId: ${tenantId}, appId: ${this.appId}, redirectUri: ${this.redirectUri}`);

    const pkceRaw = sessionStorage.getItem('sso_pkce_ctx');
    let codeChallenge: string;
    let codeVerifier: string | undefined;
    let state: string | undefined;
    let nonce: string | undefined;

    if (pkceRaw) {
      const pkceCtx = JSON.parse(pkceRaw);
      codeChallenge = pkceCtx.codeChallenge;
      state = pkceCtx.state;
      nonce = pkceCtx.nonce;
    } else {
      codeVerifier = await generateCodeVerifier();
      codeChallenge = await generateCodeChallenge(codeVerifier);
    }

    this.authService
      .authorizeV2(tenantId, this.appId, this.redirectUri, codeChallenge, 'S256', codeVerifier, state, nonce)
      .subscribe({
        next: (response) => {
          console.log(`[TenantSelector] Authorization success, redirecting to: ${response.redirectUri}`);
          if (this.isEmbedded) {
            try {
              if (pkceRaw && response.signedPayload) {
                const pkceCtx = JSON.parse(pkceRaw);
                console.log(`[TenantSelector] Embedded mode (iframe): sending sso-success with signed_payload`);
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
              } else if (response.signedPayload) {
                window.location.href = `${this.redirectUri}?payload=${encodeURIComponent(response.signedPayload)}`;
              } else {
                window.location.href = response.redirectUri;
              }
            } catch (e) {
              console.error("[TenantSelector] Error in embedded success", e);
            }
          } else {
            if (response.signedPayload) {
              window.location.href = `${this.redirectUri}?payload=${encodeURIComponent(response.signedPayload)}`;
            } else {
              window.location.href = response.redirectUri;
            }
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