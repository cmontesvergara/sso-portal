import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
    AuthService,
    TenantWithApps,
} from 'src/app/core/services/auth/auth.service';
import { LoadingService } from 'src/app/core/services/loading/loading.service';

@Component({
    selector: 'app-connected-services-card',
    templateUrl: './connected-services-card.component.html',
    standalone: true,
    imports: [CommonModule],
})
export class ConnectedServicesCardComponent implements OnInit {
    tenants: TenantWithApps[] = [];
    totalApps = 0;
    loadingTenants = true;

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
                this.loadingTenants = false;
            },
            error: (err) => {
                console.error('Error loading tenants:', err);
                this.loadingTenants = false;
            },
        });
    }

    launchApp(tenantId: string, appId: string, appUrl: string) {
        const redirectUri = `${appUrl}/auth/callback`;
        this.authService.authorize(tenantId, appId, redirectUri).subscribe({
            next: (response) => {
                window.location.href = response.redirectUri;
            },
            error: (err) => {
                console.error('Error launching app:', err);
                alert('Error al lanzar aplicación');
            },
        });
    }

    viewAllApps() {
        this.router.navigate(['/sso-dashboard']);
    }
}
