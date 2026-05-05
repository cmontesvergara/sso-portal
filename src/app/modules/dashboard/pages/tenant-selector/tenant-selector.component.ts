import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  AuthService,
  TenantWithApps,
} from 'src/app/core/services/auth/auth.service';
import { UserService } from 'src/app/core/services/user/user.service';
import { generateCodeChallenge, generateCodeVerifier } from 'src/app/core/utils/pkce';
import { environment } from 'src/environments/environment';

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
  tenantId: string = '';
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
    this.tenantId = this.route.snapshot.queryParams['tenant_id'] || '';

    console.log(`[TenantSelector] Query params -> redirectUri: ${this.redirectUri}, appId: ${this.appId}, tenantId: ${this.tenantId}`);

    if (!this.redirectUri || !this.appId) {
      console.log('[TenantSelector] Missing redirectUri or appId, navigating to /dashboard');
      this.router.navigate(['/dashboard']);
      return;
    }

    // this.loadTenants();
    this.selectTenant(this.tenantId || environment.tenantId);
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