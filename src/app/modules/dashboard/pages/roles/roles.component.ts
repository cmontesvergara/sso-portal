import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Application,
  AppResource,
  CreatePermissionDto,
  CreateRoleDto,
  CustomRole,
  Permission,
  SystemRole,
  Tenant,
  TenantRole,
  UserProfile,
} from 'src/app/core/models';
import { AppResourceService } from 'src/app/core/services/app-resource.service';
import { ApplicationManagementService } from 'src/app/core/services/application-management.service';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { RoleManagementService } from 'src/app/core/services/role-management.service';
import { TenantManagementService } from 'src/app/core/services/tenant-management.service';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.scss',
})
export class RolesComponent implements OnInit {
  tenantId: string = '';
  tenant: Tenant | null = null;
  roles: CustomRole[] = [];
  selectedRole: CustomRole | null = null;
  permissions: Permission[] = [];
  loading = true;
  loadingPermissions = false;
  error: string | null = null;
  success: string | null = null;
  user: UserProfile | null = null;

  // Modal states
  showCreateRoleModal = false;
  showEditRoleModal = false;
  showDeleteRoleModal = false;
  showPermissionsModal = false;
  showAddPermissionModal = false;
  showDeletePermissionModal = false;
  selectedPermission: Permission | null = null;

  // Form data
  createRoleForm = {
    name: '',
  };

  editRoleForm = {
    name: '',
  };

  addPermissionForm = {
    applicationId: '',
    resource: '',
    action: '',
  };

  // Available apps, resources and actions from backend
  availableApplications: Application[] = [];
  availableResources: AppResource[] = [];
  filteredResources: string[] = [];
  filteredActions: string[] = [];
  loadingResources = false;

  constructor(
    private roleService: RoleManagementService,
    private tenantService: TenantManagementService,
    private authService: AuthService,
    private appResourceService: AppResourceService,
    private applicationManagementService: ApplicationManagementService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  async ngOnInit() {
    // Get tenant ID from route
    this.tenantId = this.route.snapshot.params['tenantId'];

    if (!this.tenantId) {
      this.error = 'No se especificó una organización';
      this.loading = false;
      return;
    }

    await this.loadUserProfile();
    await this.loadTenant();
    await this.loadRoles();
  }

  async loadUserProfile() {
    this.authService.getProfile().subscribe({
      next: (response) => {
        this.user = response.user;
      },
      error: (err) => {
        console.error('Error loading profile:', err);
      },
    });
  }

  async loadTenant() {
    // First, get all user's tenants to find the role
    this.tenantService.getAllTenants().subscribe({
      next: (response) => {
        const userTenant = response.tenants.find((t) => t.id === this.tenantId);
        if (userTenant) {
          this.tenant = userTenant;
        } else {
          this.error = 'No tienes acceso a esta organización';
        }
      },
      error: (err) => {
        console.error('Error loading tenant:', err);
        this.error = err.error?.message || 'Error al cargar la organización';
      },
    });
  }

  async loadRoles() {
    this.loading = true;
    this.error = null;

    this.roleService.getTenantRoles(this.tenantId).subscribe({
      next: (response) => {
        this.roles = response.roles;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading roles:', err);
        this.error = err.error?.message || 'Error al cargar roles';
        this.loading = false;
      },
    });
  }

  async loadPermissions(roleId: string) {
    this.loadingPermissions = true;

    this.roleService.getRolePermissions(roleId).subscribe({
      next: (response) => {
        this.permissions = response.permissions;
        this.loadingPermissions = false;
      },
      error: (err) => {
        console.error('Error loading permissions:', err);
        this.error = err.error?.message || 'Error al cargar permisos';
        this.loadingPermissions = false;
      },
    });
  }

  // Permission checks
  canManageRoles(): boolean {
    if (this.user?.systemRole === SystemRole.SUPER_ADMIN || this.user?.systemRole === SystemRole.SYSTEM_ADMIN) {
      return true;
    }
    return this.tenant?.role === TenantRole.ADMIN;
  }

  isDefaultRole(roleName: string): boolean {
    return ['admin', 'member', 'viewer'].includes(roleName.toLowerCase());
  }

  // Modal controls
  openCreateRoleModal() {
    this.createRoleForm = {
      name: '',
    };
    this.showCreateRoleModal = true;
    this.error = null;
    this.success = null;
  }

  closeCreateRoleModal() {
    this.showCreateRoleModal = false;
  }

  openEditRoleModal(role: CustomRole) {
    if (this.isDefaultRole(role.name)) {
      this.error = 'No se pueden editar roles predeterminados';
      return;
    }

    this.selectedRole = role;
    this.editRoleForm = {
      name: role.name,
    };
    this.showEditRoleModal = true;
    this.error = null;
    this.success = null;
  }

  closeEditRoleModal() {
    this.showEditRoleModal = false;
    this.selectedRole = null;
  }

  openDeleteRoleModal(role: CustomRole) {
    if (this.isDefaultRole(role.name)) {
      this.error = 'No se pueden eliminar roles predeterminados';
      return;
    }

    this.selectedRole = role;
    this.showDeleteRoleModal = true;
    this.error = null;
    this.success = null;
  }

  closeDeleteRoleModal() {
    this.showDeleteRoleModal = false;
    this.selectedRole = null;
  }

  openPermissionsModal(role: CustomRole) {
    this.selectedRole = role;
    this.showPermissionsModal = true;
    this.loadPermissions(role.id);
    this.error = null;
    this.success = null;
  }

  closePermissionsModal() {
    this.showPermissionsModal = false;
    this.selectedRole = null;
    this.permissions = [];
  }

  openAddPermissionModal() {
    this.addPermissionForm = {
      applicationId: '',
      resource: '',
      action: '',
    };
    this.loadAvailableResources();
    this.showAddPermissionModal = true;
    this.error = null;
    this.success = null;
  }

  closeAddPermissionModal() {
    this.showAddPermissionModal = false;
  }

  openDeletePermissionModal(permission: Permission) {
    this.selectedPermission = permission;
    this.showDeletePermissionModal = true;
    this.error = null;
    this.success = null;
  }

  closeDeletePermissionModal() {
    this.showDeletePermissionModal = false;
    this.selectedPermission = null;
  }

  // Load available resources for tenant
  async loadAvailableResources() {
    this.loadingResources = true;
    this.error = null;

    this.appResourceService
      .getAvailableResourcesForTenant(this.tenantId)
      .subscribe({
        next: (response) => {
          this.availableResources = response.resources;

          // Get unique applications
          const appMap = new Map<string, Application>();
          this.availableResources.forEach((resource) => {
            if (!appMap.has(resource.appId)) {
              appMap.set(resource.appId, {
                id: '', // We don't have full app data, but appId is enough
                appId: resource.appId,
                name: resource.applicationName,
                url: '',
                description: null,
                logoUrl: null,
                isActive: true,
                createdAt: '',
                updatedAt: '',
              });
            }
          });
          this.availableApplications = Array.from(appMap.values());
          this.loadingResources = false;
        },
        error: (err) => {
          console.error('Error loading available resources:', err);
          this.error =
            err.error?.message || 'Error al cargar recursos disponibles';
          this.loadingResources = false;
        },
      });
  }

  // Filter resources when application changes
  onApplicationChange() {
    if (!this.addPermissionForm.applicationId) {
      this.filteredResources = [];
      this.filteredActions = [];
      this.addPermissionForm.resource = '';
      this.addPermissionForm.action = '';
      return;
    }

    const selectedApp = this.availableApplications.find(
      (app) => app.appId === this.addPermissionForm.applicationId,
    );

    if (selectedApp) {
      // Get unique resources for selected app
      const resourcesForApp = this.availableResources.filter(
        (r) => r.appId === selectedApp.appId,
      );
      this.filteredResources = [
        ...new Set(resourcesForApp.map((r) => r.resource)),
      ];
      this.addPermissionForm.resource = '';
      this.addPermissionForm.action = '';
      this.filteredActions = [];
    }
  }

  // Filter actions when resource changes
  onResourceChange() {
    if (
      !this.addPermissionForm.resource ||
      !this.addPermissionForm.applicationId
    ) {
      this.filteredActions = [];
      this.addPermissionForm.action = '';
      return;
    }

    const selectedApp = this.availableApplications.find(
      (app) => app.appId === this.addPermissionForm.applicationId,
    );

    if (selectedApp) {
      // Get actions for selected app and resource
      const actionsForResource = this.availableResources.filter(
        (r) =>
          r.appId === selectedApp.appId &&
          r.resource === this.addPermissionForm.resource,
      );
      this.filteredActions = actionsForResource.map((r) => r.action);
      this.addPermissionForm.action = '';
    }
  }

  // CRUD operations
  async createRole() {
    if (!this.createRoleForm.name) {
      this.error = 'El nombre del rol es requerido';
      return;
    }

    this.loading = true;
    this.error = null;

    const data: CreateRoleDto = {
      name: this.createRoleForm.name,
      tenantId: this.tenantId,
    };

    this.roleService.createRole(data).subscribe({
      next: (response) => {
        this.success = 'Rol creado exitosamente';
        this.closeCreateRoleModal();
        this.loadRoles();
      },
      error: (err) => {
        console.error('Error creating role:', err);
        this.error = err.error?.message || 'Error al crear rol';
        this.loading = false;
      },
    });
  }

  async updateRole() {
    if (!this.selectedRole || !this.editRoleForm.name) {
      this.error = 'El nombre del rol es requerido';
      return;
    }

    this.loading = true;
    this.error = null;

    this.roleService
      .updateRole(this.selectedRole.id, this.editRoleForm)
      .subscribe({
        next: (response) => {
          this.success = 'Rol actualizado exitosamente';
          this.closeEditRoleModal();
          this.loadRoles();
        },
        error: (err) => {
          console.error('Error updating role:', err);
          this.error = err.error?.message || 'Error al actualizar rol';
          this.loading = false;
        },
      });
  }

  async deleteRole() {
    if (!this.selectedRole) {
      return;
    }

    this.loading = true;
    this.error = null;

    this.roleService.deleteRole(this.selectedRole.id).subscribe({
      next: (response) => {
        this.success = 'Rol eliminado exitosamente';
        this.closeDeleteRoleModal();
        this.loadRoles();
      },
      error: (err) => {
        console.error('Error deleting role:', err);
        this.error = err.error?.message || 'Error al eliminar rol';
        this.loading = false;
      },
    });
  }

  async addPermission() {
    if (
      !this.selectedRole ||
      !this.addPermissionForm.applicationId ||
      !this.addPermissionForm.resource ||
      !this.addPermissionForm.action
    ) {
      this.error = 'Aplicación, recurso y acción son requeridos';
      return;
    }

    this.loadingPermissions = true;
    this.error = null;

    // Find the full application ID from appId
    const selectedApp = this.availableApplications.find(
      (app) => app.appId === this.addPermissionForm.applicationId,
    );

    if (!selectedApp) {
      this.error = 'Aplicación no encontrada';
      this.loadingPermissions = false;
      return;
    }

    // Get the actual application ID (UUID) from backend
    this.applicationManagementService.getAllApplications().subscribe({
      next: (appsResponse: {
        success: boolean;
        applications: Application[];
      }) => {
        const fullApp = appsResponse.applications.find(
          (a: Application) => a.appId === selectedApp.appId,
        );

        if (!fullApp) {
          this.error = 'No se pudo obtener el ID de la aplicación';
          this.loadingPermissions = false;
          return;
        }

        const data: CreatePermissionDto = {
          applicationId: fullApp.id,
          resource: this.addPermissionForm.resource,
          action: this.addPermissionForm.action,
        };

        this.roleService.addPermission(this.selectedRole!.id, data).subscribe({
          next: (response) => {
            this.success = 'Permiso agregado exitosamente';
            this.closeAddPermissionModal();
            this.loadPermissions(this.selectedRole!.id);
          },
          error: (err) => {
            console.error('Error adding permission:', err);
            this.error = err.error?.message || 'Error al agregar permiso';
            this.loadingPermissions = false;
          },
        });
      },
      error: (err) => {
        console.error('Error loading applications:', err);
        this.error = 'Error al cargar aplicaciones';
        this.loadingPermissions = false;
      },
    });
  }

  async removePermission() {
    if (!this.selectedRole || !this.selectedPermission) {
      return;
    }

    this.loadingPermissions = true;
    this.error = null;

    this.roleService
      .removePermission(this.selectedRole.id, this.selectedPermission.id)
      .subscribe({
        next: (response) => {
          this.success = 'Permiso eliminado exitosamente';
          this.closeDeletePermissionModal();
          this.loadPermissions(this.selectedRole!.id);
        },
        error: (err) => {
          console.error('Error removing permission:', err);
          this.error = err.error?.message || 'Error al eliminar permiso';
          this.loadingPermissions = false;
        },
      });
  }

  goBack() {
    this.router.navigate(['/dashboard/tenants']);
  }
}
