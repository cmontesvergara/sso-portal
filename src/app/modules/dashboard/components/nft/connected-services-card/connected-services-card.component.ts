import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
    AuthService,
    TenantWithApps,
} from 'src/app/core/services/auth/auth.service';
import { LoadingService } from 'src/app/core/services/loading/loading.service';
import { generateCodeVerifier, generateCodeChallenge } from 'src/app/core/utils/pkce';

import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-connected-services-card',
    templateUrl: './connected-services-card.component.html',
    standalone: true,
    imports: [CommonModule, FormsModule],
})
export class ConnectedServicesCardComponent implements OnInit {
    tenants: TenantWithApps[] = [];
    totalApps = 0;
    loadingTenants = true;

    // Redesign State
    activeTenantId: string | null = null;
    searchQuery: string = '';
    showDropdown: boolean = false;

    get filteredTenants(): TenantWithApps[] {
        if (!this.searchQuery) {
            return this.tenants;
        }
        const query = this.searchQuery.toLowerCase();
        return this.tenants.filter(
            (t) => t.name.toLowerCase().includes(query) || t.slug.toLowerCase().includes(query)
        );
    }

    get activeTenant(): TenantWithApps | null {
        return this.tenants.find((t) => t.tenantId === this.activeTenantId) || null;
    }

    selectTenant(tenantId: string) {
        this.activeTenantId = tenantId;
        this.showDropdown = false;
        this.searchQuery = '';
    }

    toggleDropdown() {
        this.showDropdown = !this.showDropdown;
    }

    // Auto-close dropdown when clicking outside could be added here, but omitted for brevity.

    constructor(
        private loadingService: LoadingService,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadTenants();
    }

    loadTenants() {
        this.authService.getUserTenants().subscribe({
            next: (response) => {
                this.tenants = response.tenants;
                this.totalApps = this.tenants.reduce(
                    (acc, tenant) => acc + tenant.apps.length,
                    0
                );

                if (this.tenants.length > 0) {
                    this.activeTenantId = this.tenants[0].tenantId;
                }

                this.loadingTenants = false;
            },
            error: (err) => {
                console.error('Error loading tenants:', err);
                this.loadingTenants = false;
            },
        });
    }

    async launchApp(tenantId: string, appId: string, appUrl: string) {
        try {
            const redirectUri = `${appUrl}/auth/callback`;
            const codeVerifier = await generateCodeVerifier();
            const codeChallenge = await generateCodeChallenge(codeVerifier);

            this.authService.authorizeV2(tenantId, appId, redirectUri, codeChallenge, 'S256', codeVerifier).subscribe({
                next: (response) => {
                    if (response.signedPayload) {
                        window.location.href = `${redirectUri}?payload=${encodeURIComponent(response.signedPayload)}`;
                    } else {
                        window.location.href = response.redirectUri;
                    }
                },
                error: (err) => {
                    console.error('Error launching app:', err);
                    alert('Error al lanzar aplicación');
                },
            });
        } catch (err) {
            console.error('PKCE generation error:', err);
            alert('Error al lanzar aplicación');
        }
    }

    viewAllApps() {
        this.router.navigate(['/sso-dashboard']);
    }
}
