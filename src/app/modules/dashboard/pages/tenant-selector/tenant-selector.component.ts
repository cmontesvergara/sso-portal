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

    this.authService
      .authorize(tenantId, this.appId, this.redirectUri)
      .subscribe({
        next: (response) => {
          console.log(`[TenantSelector] Authorization success, redirecting to: ${response.redirectUri}`);
          // Redirect to app with auth code
          window.location.href = response.redirectUri;
        },
        error: (err) => {
          console.error('Error authorizing:', err);
          this.selecting = false;
          alert('Error al autorizar acceso');
        },
      });
  }
}
