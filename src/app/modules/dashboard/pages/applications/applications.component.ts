import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { Application, SystemRole, UserProfile } from 'src/app/core/models';
import { ApplicationManagementService } from 'src/app/core/services/application-management.service';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { GenericTableComponent } from 'src/app/shared/components/generic-table/generic-table.component';
import { TableColumn } from 'src/app/shared/components/generic-table/models/table-column.model';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AngularSvgIconModule,
    GenericTableComponent
  ],
  templateUrl: './applications.component.html',
  styleUrl: './applications.component.scss',
})
export class ApplicationsComponent implements OnInit {
  applications: Application[] = [];
  loading = true;
  error: string | null = null;
  user: UserProfile | null = null;

  tableColumns: TableColumn[] = [];

  // Templates
  @ViewChild('appTemplate', { static: true }) appTemplate!: TemplateRef<any>;
  @ViewChild('urlTemplate', { static: true }) urlTemplate!: TemplateRef<any>;
  @ViewChild('statusTemplate', { static: true }) statusTemplate!: TemplateRef<any>;
  @ViewChild('dateTemplate', { static: true }) dateTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate', { static: true }) actionsTemplate!: TemplateRef<any>;

  // Form state
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  selectedApp: Application | null = null;

  formData = {
    appId: '',
    name: '',
    url: '',
    description: '',
    logoUrl: '',
    isActive: true,
  };

  constructor(
    private appManagementService: ApplicationManagementService,
    private authService: AuthService,
    private router: Router,
  ) { }

  async ngOnInit() {
    await this.loadUserProfile();
    this.initColumns(); // Initialize columns AFTER view init would be safer if using static: false, but static: true is ok here
    await this.loadApplications();
  }

  initColumns() {
    this.tableColumns = [
      { header: 'APLICACIÓN', field: 'name', template: this.appTemplate, width: '30%' },
      { header: 'APP ID', field: 'appId', width: '15%' },
      { header: 'URL', field: 'url', template: this.urlTemplate, width: '20%' },
      { header: 'ESTADO', field: 'isActive', template: this.statusTemplate, width: '10%' },
      { header: 'CREADA', field: 'createdAt', template: this.dateTemplate, width: '10%' },
      { header: 'ACCIONES', template: this.actionsTemplate, width: '15%' },
    ];
  }

  async loadUserProfile() {
    this.authService.getProfile().subscribe({
      next: (response) => {
        this.user = response.user;

        // Check if user has admin permissions
        if (!this.canManageApps()) {
          this.error = 'No tienes permisos para acceder a esta página';
          setTimeout(() => this.router.navigate(['/dashboard']), 2000);
        }
      },
      error: (err) => {
        console.error('Error loading profile:', err);
        this.error = 'Error al cargar perfil de usuario';
      },
    });
  }

  async loadApplications() {
    this.loading = true;
    this.appManagementService.getAllApplications().subscribe({
      next: (response) => {
        this.applications = response.applications;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading applications:', err);
        this.error = 'Error al cargar aplicaciones';
        this.loading = false;
      },
    });
  }

  canManageApps(): boolean {
    return (
      this.user?.systemRole === SystemRole.SYSTEM_ADMIN ||
      this.user?.systemRole === SystemRole.SUPER_ADMIN
    );
  }

  canDeleteApps(): boolean {
    return this.user?.systemRole === SystemRole.SUPER_ADMIN;
  }

  openCreateModal() {
    this.formData = {
      appId: '',
      name: '',
      url: '',
      description: '',
      logoUrl: '',
      isActive: true,
    };
    this.showCreateModal = true;
  }

  openEditModal(app: Application) {
    this.selectedApp = app;
    this.formData = {
      appId: app.appId,
      name: app.name,
      url: app.url,
      description: app.description || '',
      logoUrl: app.logoUrl || '',
      isActive: app.isActive,
    };
    this.showEditModal = true;
  }

  openDeleteModal(app: Application) {
    this.selectedApp = app;
    this.showDeleteModal = true;
  }

  closeModals() {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedApp = null;
  }

  createApplication() {
    this.appManagementService.createApplication(this.formData).subscribe({
      next: () => {
        this.closeModals();
        this.loadApplications();
      },
      error: (err) => {
        console.error('Error creating application:', err);
        alert(
          'Error al crear aplicación: ' +
          (err.error?.message || 'Error desconocido'),
        );
      },
    });
  }

  updateApplication() {
    if (!this.selectedApp) return;

    const { appId, ...updateData } = this.formData;

    this.appManagementService
      .updateApplication(this.selectedApp.id, updateData)
      .subscribe({
        next: () => {
          this.closeModals();
          this.loadApplications();
        },
        error: (err) => {
          console.error('Error updating application:', err);
          alert(
            'Error al actualizar aplicación: ' +
            (err.error?.message || 'Error desconocido'),
          );
        },
      });
  }

  deleteApplication() {
    if (!this.selectedApp) return;

    this.appManagementService.deleteApplication(this.selectedApp.id).subscribe({
      next: () => {
        this.closeModals();
        this.loadApplications();
      },
      error: (err) => {
        console.error('Error deleting application:', err);
        alert(
          'Error al eliminar aplicación: ' +
          (err.error?.message || 'Error desconocido'),
        );
      },
    });
  }

  toggleAppStatus(app: Application) {
    this.appManagementService
      .updateApplication(app.id, { isActive: !app.isActive })
      .subscribe({
        next: () => {
          this.loadApplications();
        },
        error: (err) => {
          console.error('Error toggling app status:', err);
          alert('Error al cambiar estado: ' + (err.error?.message || 'Error desconocido'));
        },
      });
  }

  syncResources(app: Application) {
    if (!confirm(`¿Estás seguro de sincronizar los recursos para ${app.name}?`)) return;

    // Optional: Add loading state for the specific row or global
    this.appManagementService.syncResources(app.appId).subscribe({
      next: (res) => {
        const count = res.data?.count ?? 0;
        alert(`Sincronización exitosa. ${count} recursos actualizados.`);
      },
      error: (err) => {
        console.error('Error syncing resources:', err);
        alert('Error al sincronizar recursos: ' + (err.error?.message || 'Error desconocido'));
      },
    });
  }
}
