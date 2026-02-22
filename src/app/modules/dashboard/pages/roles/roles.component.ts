import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
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

interface ResourceGroup {
  resource: string;
  actions: {
    action: string;
    hasPermission: boolean;
    permissionId?: string;
    originalState: boolean;
    appId: string;
    applicationId: string;
  }[];
}

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

  // Form data
  createRoleForm = {
    name: '',
  };

  editRoleForm = {
    name: '',
  };

  // Available apps, resources and actions from backend
  availableApplications: Application[] = [];
  availableResources: AppResource[] = [];

  // Tree state
  selectedAppId: string = '';
  groupedResources: ResourceGroup[] = [];
  hasUnsavedChanges: boolean = false;

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

  async openPermissionsModal(role: CustomRole) {
    this.selectedRole = role;
    this.showPermissionsModal = true;
    this.error = null;
    this.success = null;
    this.selectedAppId = '';
    this.groupedResources = [];
    this.hasUnsavedChanges = false;
    this.loadingPermissions = true;

    try {
      // Fetch currently assigned permissions
      const permRes = await firstValueFrom(this.roleService.getRolePermissions(role.id));
      this.permissions = permRes.permissions;

      // Fetch all resources available to this tenant
      const resRes = await firstValueFrom(this.appResourceService.getAvailableResourcesForTenant(this.tenantId));
      this.availableResources = resRes.resources;

      // We need the actual application UUIDs for creating permissions, fetch all apps
      let allApps: Application[] = [];
      try {
        const appsRes = await firstValueFrom(this.applicationManagementService.getAllApplications());
        allApps = appsRes.applications || [];
      } catch (e) {
        console.error('Error fetching applications to map IDs', e);
      }

      // Extract unique applications
      const appMap = new Map<string, Application>();
      this.availableResources.forEach((resource) => {
        if (!appMap.has(resource.appId)) {
          const matchedApp = allApps.find(a => a.appId === resource.appId);
          appMap.set(resource.appId, {
            id: matchedApp?.id || '', // Internal Application ID needed for backend
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

      this.loadingPermissions = false;

      // Select the first app by default to show its tree
      if (this.availableApplications.length > 0) {
        this.selectedAppId = this.availableApplications[0].appId;
        this.onAppSelectionChange();
      }
    } catch (err: any) {
      console.error('Error loading permissions data:', err);
      this.loadingPermissions = false;
      this.error = err.error?.message || 'Error al cargar permisos';
    }
  }

  closePermissionsModal() {
    if (this.hasUnsavedChanges) {
      if (!confirm('Tienes cambios sin guardar. ¿Estás seguro de cerrar?')) {
        return;
      }
    }
    this.showPermissionsModal = false;
    this.selectedRole = null;
    this.permissions = [];
    this.groupedResources = [];
    this.hasUnsavedChanges = false;
  }

  onAppSelectionChange() {
    this.error = null;
    this.success = null;

    if (!this.selectedAppId) {
      this.groupedResources = [];
      return;
    }

    const selectedApp = this.availableApplications.find(a => a.appId === this.selectedAppId);
    if (!selectedApp) return;

    const resourcesForApp = this.availableResources.filter(r => r.appId === this.selectedAppId);

    const groups: { [key: string]: ResourceGroup } = {};

    for (const res of resourcesForApp) {
      if (!groups[res.resource]) {
        groups[res.resource] = { resource: res.resource, actions: [] };
      }

      const assignedPerm = this.permissions.find(p => p.appId === res.appId && p.resource === res.resource && p.action === res.action);

      groups[res.resource].actions.push({
        action: res.action,
        hasPermission: !!assignedPerm,
        originalState: !!assignedPerm,
        permissionId: assignedPerm?.id,
        appId: res.appId,
        applicationId: selectedApp.id
      });
    }

    this.groupedResources = Object.values(groups);
  }

  togglePermission(actionItem: any) {
    if (!this.canManageRoles() || this.isDefaultRole(this.selectedRole?.name || '')) {
      return; // Readonly mode prevents toggling
    }
    actionItem.hasPermission = !actionItem.hasPermission;
    this.checkUnsavedChanges();
  }

  checkUnsavedChanges() {
    let hasChanges = false;

    // Check all actions to see if any toggled state differs from its original server state
    for (const group of this.groupedResources) {
      for (const item of group.actions) {
        if (item.hasPermission !== item.originalState) {
          hasChanges = true;
          break;
        }
      }
      if (hasChanges) break;
    }

    this.hasUnsavedChanges = hasChanges;
  }

  selectAllForResource(group: ResourceGroup, isChecked: boolean) {
    if (!this.canManageRoles() || this.isDefaultRole(this.selectedRole?.name || '')) return;
    for (const actionItem of group.actions) {
      actionItem.hasPermission = isChecked;
    }
    this.checkUnsavedChanges();
  }

  areAllSelected(group: ResourceGroup): boolean {
    return group.actions.length > 0 && group.actions.every(a => a.hasPermission);
  }

  async savePermissions() {
    if (!this.selectedRole || !this.hasUnsavedChanges) return;

    this.loadingPermissions = true;
    this.error = null;
    this.success = null;

    const addPromises: Promise<any>[] = [];
    const removePromises: Promise<any>[] = [];

    for (const group of this.groupedResources) {
      for (const actionItem of group.actions) {
        // If it was added
        if (actionItem.hasPermission && !actionItem.originalState) {
          addPromises.push(firstValueFrom(this.roleService.addPermission(this.selectedRole.id, {
            applicationId: actionItem.applicationId,
            resource: group.resource,
            action: actionItem.action
          })));
        }
        // If it was removed
        else if (!actionItem.hasPermission && actionItem.originalState && actionItem.permissionId) {
          removePromises.push(firstValueFrom(this.roleService.removePermission(this.selectedRole.id, actionItem.permissionId)));
        }
      }
    }

    try {
      await Promise.all([...addPromises, ...removePromises]);
      this.success = 'Permisos actualizados exitosamente';

      // Refresh current state after successful save
      const permRes = await firstValueFrom(this.roleService.getRolePermissions(this.selectedRole.id));
      this.permissions = permRes.permissions;
      this.hasUnsavedChanges = false;

      // Re-initialize the tree with the newly saved originalStates
      this.onAppSelectionChange();

      this.loadingPermissions = false;
    } catch (err: any) {
      console.error(err);
      this.loadingPermissions = false;
      this.error = 'Ocurrió un error parcial al actualizar permisos. Verifica la selección actual.';
      // Refresh anyway to display the true server state
      try {
        const permRes = await firstValueFrom(this.roleService.getRolePermissions(this.selectedRole.id));
        this.permissions = permRes.permissions;
        this.onAppSelectionChange();
      } catch (e) { }
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

  goBack() {
    this.router.navigate(['/dashboard/tenants']);
  }
}
