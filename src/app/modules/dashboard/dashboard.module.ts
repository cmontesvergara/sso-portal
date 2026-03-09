import { NgModule } from '@angular/core';

import { CommonModule } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { ApplicationsComponent } from './pages/applications/applications.component';
import { TenantsComponent } from './pages/tenants/tenants.component';
import { UsersComponent } from './pages/users/users.component';

@NgModule({
  imports: [
    DashboardRoutingModule,
    AngularSvgIconModule.forRoot(),
    CommonModule,

    ApplicationsComponent, // Import standalone component
    TenantsComponent,
    UsersComponent // Import standalone component
  ],
})
export class DashboardModule { }
