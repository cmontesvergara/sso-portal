import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { systemAdminGuard } from 'src/app/core/guards/system-admin.guard';
import { DashboardComponent } from './dashboard.component';
import { ApplicationsComponent } from './pages/applications/applications.component';
import { HomeComponent } from './pages/home/home.component';
import { NftComponent } from './pages/nft/nft.component';
import { RolesComponent } from './pages/roles/roles.component';
import { TenantSelectorComponent } from './pages/tenant-selector/tenant-selector.component';
import { TenantsComponent } from './pages/tenants/tenants.component';
import { isLoggedGuard } from 'src/app/core/guards/is-logged/is-logged.guard';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,

    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'nfts', component: NftComponent },
      {
        path: 'applications',
        component: ApplicationsComponent,
        canActivate: [systemAdminGuard],
      },
      {
        path: 'tenants',
        component: TenantsComponent,
        // Any logged user can view tenants (they see only their tenants)
        // System admins can create new tenants
      },
      {
        path: 'roles/:tenantId',
        component: RolesComponent,
        // Any tenant member can view roles
        // Only tenant admins can manage roles
      },
      {
        path: 'home',
        component: HomeComponent,
      },
      {
        path: 'profile',
        canActivate: [isLoggedGuard],
        loadChildren: () =>
          import('../profile/profile.module').then((m) => m.ProfileModule),
      },
      { path: '**', redirectTo: 'errors/404' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule { }
