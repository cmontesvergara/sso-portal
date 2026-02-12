import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AuthService,
  TenantWithApps,
} from 'src/app/core/services/auth/auth.service';

@Component({
  selector: 'app-tenant-selector',
  standalone: true,
  imports: [CommonModule],
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
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit() {
    // Get query params
    this.redirectUri = this.route.snapshot.queryParams['redirect_uri'] || '';
    this.appId = this.route.snapshot.queryParams['app_id'] || '';

    if (!this.redirectUri || !this.appId) {
      // If no redirect params, go to dashboard
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadTenants();
  }

  loadTenants() {
    this.authService.getUserTenants().subscribe({
      next: (response) => {
        // Filter tenants by app access
        if (this.appId) {
          this.tenants = response.tenants.filter((t) =>
            t.apps.some((app) => app.appId === this.appId),
          );
        } else {
          this.tenants = response.tenants;
        }

        this.loading = false;

        // Auto-select if only one tenant
        if (this.tenants.length === 1) {
          this.selectTenant(this.tenants[0].tenantId);
        } else if (this.tenants.length === 0) {
          alert('No tienes acceso a esta aplicación');
          this.router.navigate(['/dashboard']);
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

    this.authService
      .authorize(tenantId, this.appId, this.redirectUri)
      .subscribe({
        next: (response) => {
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
