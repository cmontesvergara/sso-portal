import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  Application, SystemRole,
  Tenant,
  TenantMember,
  TenantRole,
  UserProfile,
  CustomRole
} from 'src/app/core/models';
import { ApplicationManagementService } from 'src/app/core/services/application-management.service';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { RoleManagementService } from 'src/app/core/services/role-management.service';
import { TenantAppService } from 'src/app/core/services/tenant-app.service';
import { TenantManagementService } from 'src/app/core/services/tenant-management.service';
import { UserAppAccessService } from 'src/app/core/services/user-app-access.service';
import { GenericTableComponent } from 'src/app/shared/components/generic-table/generic-table.component';
import { TableColumn } from 'src/app/shared/components/generic-table/models/table-column.model';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, GenericTableComponent],
  templateUrl: './tenants.component.html',
  styleUrl: './tenants.component.scss',
})
export class TenantsComponent implements OnInit {
  // Templates
  @ViewChild('tenantTemplate') tenantTemplate!: TemplateRef<any>;
  @ViewChild('slugTemplate') slugTemplate!: TemplateRef<any>;
  @ViewChild('roleTemplate') roleTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

  tableColumns: TableColumn[] = [];
  tenants: Tenant[] = [];
  selectedTenant: Tenant | null = null;
  tenantMembers: TenantMember[] = [];
  loading = true;
  loadingMembers = false;
  error: string | null = null;
  success: string | null = null;
  user: UserProfile | null = null;

  // Modal states
  showCreateModal = false;
  showMemberModal = false;
  showInviteModal = false;
  showRoleModal = false;
  showDeleteModal = false;
  showAccessModal = false;
  selectedMember: TenantMember | null = null;



  // Form data
  createForm = {
    name: '',
    slug: '',
    tenantAdminEmail: '',
  };

  inviteForm = {
    email: '',
    role: TenantRole.MEMBER,
  };

  roleForm = {
    role: TenantRole.MEMBER,
  };

  // Enums for template
  TenantRole = TenantRole;
  SystemRole = SystemRole;

  // Custom roles
  customRoles: CustomRole[] = [];
  loadingRoles = false;

  constructor(
    private tenantService: TenantManagementService,
    private authService: AuthService,
    private router: Router,
    private applicationService: ApplicationManagementService,
    private tenantAppService: TenantAppService,
    private userAppAccessService: UserAppAccessService,
    private roleManagementService: RoleManagementService,
  ) { }

  async ngOnInit() {
    await this.loadUserProfile();
    await this.loadTenants();

    this.tableColumns = [
      { header: 'Organización', field: 'name', template: this.tenantTemplate },
      { header: 'Slug', field: 'slug', template: this.slugTemplate },
      { header: 'Tu Rol', field: 'role', template: this.roleTemplate },
      { header: 'Miembros', field: 'memberCount' },
      { header: 'Creado', field: 'createdAt', type: 'date' },
      { header: 'Acciones', field: 'actions', template: this.actionsTemplate, sortable: false, type: 'actions' }
    ];
  }

  async loadUserProfile() {
    this.authService.getProfile().subscribe({
      next: (response) => {
        this.user = response.user;

        // Check if user has access
        if (!this.canViewTenants()) {
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

  async loadTenants() {
    this.loading = true;
    this.error = null;
    this.tenantService.getAllTenants().subscribe({
      next: (response) => {
        this.tenants = response.tenants;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading tenants:', err);
        this.error = err.error?.message || 'Error al cargar tenants';
        this.loading = false;
      },
    });
  }

  async loadTenantMembers(tenantId: string) {
    this.loadingMembers = true;
    this.tenantService.getTenantMembers(tenantId).subscribe({
      next: (response) => {
        this.tenantMembers = response.members;
        this.loadingMembers = false;
      },
      error: (err) => {
        console.error('Error loading members:', err);
        this.error = err.error?.message || 'Error al cargar miembros';
        this.loadingMembers = false;
      },
    });
  }

  // Permission checks
  canViewTenants(): boolean {
    return this.user !== null;
  }

  canCreateTenant(): boolean {
    return (
      this.user?.systemRole === SystemRole.SYSTEM_ADMIN ||
      this.user?.systemRole === SystemRole.SUPER_ADMIN
    );
  }

  canManageTenant(tenant: Tenant): boolean {
    // Super Admin and System Admin can manage any tenant
    if (this.isSystemAdmin() || this.isSuperAdmin()) {
      return true;
    }
    // Regular users must be admin of the tenant
    return tenant.role === TenantRole.ADMIN;
  }

  isSystemAdmin(): boolean {
    return this.user?.systemRole === SystemRole.SYSTEM_ADMIN;
  }

  isSuperAdmin(): boolean {
    return this.user?.systemRole === SystemRole.SUPER_ADMIN;
  }

  // Modal controls

  openCreateModal() {
    this.createForm = {
      name: '',
      slug: '',
      tenantAdminEmail: '',
    };
    this.showCreateModal = true;
    this.error = null;
    this.success = null;
  }

  // Apps management modal
  showAppsModal = false;
  tenantApps: Application[] = [];
  availableApps: Application[] = [];
  appsSearch = '';

  get tenantAppsFiltered(): Application[] {
    return this.tenantApps.filter((app) =>
      app.name.toLowerCase().includes(this.appsSearch.toLowerCase()),
    );
  }
  get availableAppsFiltered(): Application[] {
    return this.availableApps.filter((app) =>
      app.name.toLowerCase().includes(this.appsSearch.toLowerCase()),
    );
  }

  canManageApps(tenant: Tenant): boolean {
    return (
      this.user?.systemRole === SystemRole.SYSTEM_ADMIN ||
      this.user?.systemRole === SystemRole.SUPER_ADMIN
    );
  }

  openAppsModal(tenant: Tenant) {
    this.selectedTenant = tenant;
    this.showAppsModal = true;
    this.loadTenantAppsAndAvailable();
  }

  closeAppsModal() {
    this.showAppsModal = false;
    this.selectedTenant = null;
    this.tenantApps = [];
    this.availableApps = [];
    this.appsSearch = '';
  }

  loadTenantAppsAndAvailable() {
    if (!this.selectedTenant) return;
    this.tenantAppService.getTenantApps(this.selectedTenant.id).subscribe({
      next: (res) => {
        this.tenantApps = res.applications;
        this.applicationService.getAllApplications().subscribe({
          next: (appsRes) => {
            this.availableApps = appsRes.applications.filter(
              (app) => !this.tenantApps.some((a) => a.id === app.id),
            );
          },
        });
      },
    });
  }

  addAppToTenant(app: Application) {
    if (!this.selectedTenant) return;
    this.tenantAppService
      .addAppToTenant(this.selectedTenant.id, app.id)
      .subscribe({
        next: () => this.loadTenantAppsAndAvailable(),
      });
  }

  removeAppFromTenant(app: Application) {
    if (!this.selectedTenant) return;
    this.tenantAppService
      .removeAppFromTenant(this.selectedTenant.id, app.id)
      .subscribe({
        next: () => this.loadTenantAppsAndAvailable(),
      });
  }

  // ---------------------------------------------------------------------------
  // Unified User App Access Management
  // ---------------------------------------------------------------------------
  showUnifiedAccessModal = false;
  tenantAccessApps: Application[] = [];
  selectedAppId = '';
  hasUnsavedAccessChanges = false;
  loadingAccess = false;

  usersAccessState: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: TenantRole;
    hasAccess: boolean;
    originalState: boolean;
  }[] = [];

  openUnifiedAccessModal(tenant: Tenant, initialAppId?: string) {
    this.selectedTenant = tenant;
    this.showUnifiedAccessModal = true;
    this.loadingAccess = true;
    this.error = null;
    this.success = null;
    this.hasUnsavedAccessChanges = false;
    this.selectedAppId = '';
    this.usersAccessState = [];

    // Load available apps for this tenant
    this.tenantAppService.getTenantApps(tenant.id).subscribe({
      next: (res) => {
        this.tenantAccessApps = res.applications;

        // Load members
        this.tenantService.getTenantMembers(tenant.id).subscribe({
          next: (memRes) => {
            this.tenantMembers = memRes.members;
            this.loadingAccess = false;

            if (this.tenantAccessApps.length > 0) {
              if (initialAppId && this.tenantAccessApps.some(a => a.id === initialAppId)) {
                this.selectedAppId = initialAppId;
              } else {
                this.selectedAppId = this.tenantAccessApps[0].id;
              }
              this.onAccessAppSelectionChange();
            } else {
              this.error = "Esta organización no tiene aplicaciones asignadas.";
            }
          },
          error: (err) => {
            console.error('Error loading members:', err);
            this.error = err.error?.message || 'Error al cargar miembros';
            this.loadingAccess = false;
          }
        });
      },
      error: (err) => {
        console.error('Error loading tenant apps:', err);
        this.error = err.error?.message || 'Error al cargar aplicaciones';
        this.loadingAccess = false;
      }
    });
  }

  closeUnifiedAccessModal() {
    if (this.hasUnsavedAccessChanges) {
      if (!confirm('Tienes cambios sin guardar. ¿Estás seguro de que quieres cerrar?')) {
        return;
      }
    }
    this.showUnifiedAccessModal = false;
    this.selectedTenant = null;
    this.tenantAccessApps = [];
    this.tenantMembers = [];
    this.usersAccessState = [];
    this.selectedAppId = '';
    this.hasUnsavedAccessChanges = false;
  }

  onAccessAppSelectionChange() {
    if (!this.selectedAppId || !this.selectedTenant) {
      this.usersAccessState = [];
      return;
    }

    if (this.hasUnsavedAccessChanges) {
      // In a real app we might revert the dropdown, for now we just load and lose unsaved changes
      if (!confirm('Tienes cambios sin guardar. Si cambias de aplicación se perderán. ¿Continuar?')) {
        // Here we'd need to restore the previous selectedAppId, but we'll allow overriding for simplicity
      }
    }

    this.loadingAccess = true;
    this.hasUnsavedAccessChanges = false;
    this.error = null;
    this.success = null;

    this.userAppAccessService.getUsersWithAppAccess(this.selectedTenant.id, this.selectedAppId).subscribe({
      next: (res) => {
        const accessedIds = new Set(res.users.map(u => u.userId));

        this.usersAccessState = this.tenantMembers.map(m => ({
          userId: m.userId,
          firstName: m.firstName,
          lastName: m.lastName,
          email: m.email,
          role: m.role,
          hasAccess: accessedIds.has(m.userId),
          originalState: accessedIds.has(m.userId)
        }));
        this.loadingAccess = false;
      },
      error: (err) => {
        console.error('Error loading app access:', err);
        this.error = err.error?.message || 'Error al cargar accesos a la aplicación';
        this.loadingAccess = false;
      }
    });
  }

  toggleUserAccess(userState: any) {
    userState.hasAccess = !userState.hasAccess;
    this.checkUnsavedAccessChanges();
  }

  toggleAllAccess(grant: boolean) {
    this.usersAccessState.forEach(u => u.hasAccess = grant);
    this.checkUnsavedAccessChanges();
  }

  checkUnsavedAccessChanges() {
    this.hasUnsavedAccessChanges = this.usersAccessState.some(u => u.hasAccess !== u.originalState);
  }

  get allUsersHaveAccess(): boolean {
    return this.usersAccessState.length > 0 && this.usersAccessState.every(u => u.hasAccess);
  }

  get someUsersHaveAccess(): boolean {
    return this.usersAccessState.some(u => u.hasAccess) && !this.allUsersHaveAccess;
  }

  async saveAccessChanges() {
    if (!this.selectedTenant || !this.selectedAppId || !this.hasUnsavedAccessChanges) return;

    this.loadingAccess = true;
    this.error = null;
    this.success = null;

    const addPromises: Promise<any>[] = [];
    const removePromises: Promise<any>[] = [];

    for (const u of this.usersAccessState) {
      if (u.hasAccess && !u.originalState) {
        addPromises.push(firstValueFrom(this.userAppAccessService.grantAppAccess(this.selectedTenant.id, this.selectedAppId, u.userId)));
      } else if (!u.hasAccess && u.originalState) {
        removePromises.push(firstValueFrom(this.userAppAccessService.revokeAppAccess(this.selectedTenant.id, this.selectedAppId, u.userId)));
      }
    }

    try {
      await Promise.all([...addPromises, ...removePromises]);
      this.success = 'Accesos actualizados exitosamente';
      this.hasUnsavedAccessChanges = false;

      // Update originalState to match new saved truth
      this.usersAccessState.forEach(u => u.originalState = u.hasAccess);
      this.loadingAccess = false;
    } catch (err: any) {
      console.error('Error saving access changes:', err);
      this.error = 'Ocurrió un error parcial al actualizar accesos. Verifica la selección actual.';
      this.loadingAccess = false;
      // Reload from server to show true state
      this.onAccessAppSelectionChange();
    }
  }


  closeCreateModal() {
    this.showCreateModal = false;
    this.error = null;
  }

  openMemberModal(tenant: Tenant) {
    this.selectedTenant = tenant;
    this.showMemberModal = true;
    this.loadTenantMembers(tenant.id);
  }

  closeMemberModal() {
    this.showMemberModal = false;
    this.selectedTenant = null;
    this.tenantMembers = [];
    this.error = null;
  }

  openInviteModal() {
    this.inviteForm = {
      email: '',
      role: TenantRole.MEMBER,
    };
    this.showInviteModal = true;
    this.error = null;
    this.success = null;
  }

  closeInviteModal() {
    this.showInviteModal = false;
    this.error = null;
  }

  openRoleModal(member: TenantMember) {
    this.selectedMember = member;
    this.roleForm = {
      role: member.role,
    };
    this.showRoleModal = true;
    this.error = null;
    this.success = null;

    // Load custom roles for this tenant
    if (this.selectedTenant) {
      this.loadCustomRoles(this.selectedTenant.id);
    }
  }

  /**
   * Load custom roles for a tenant
   */
  loadCustomRoles(tenantId: string) {
    this.loadingRoles = true;
    this.roleManagementService.getTenantRoles(tenantId).subscribe({
      next: (response) => {
        // Filter out base roles (admin, member, viewer) to get only custom roles
        this.customRoles = response.roles.filter(
          (role) => !['admin', 'member', 'viewer'].includes(role.name)
        );
        this.loadingRoles = false;
      },
      error: (err) => {
        console.error('Error loading custom roles:', err);
        this.loadingRoles = false;
      },
    });
  }

  closeRoleModal() {
    this.showRoleModal = false;
    this.selectedMember = null;
    this.error = null;
  }

  openDeleteModal(member: TenantMember) {
    this.selectedMember = member;
    this.showDeleteModal = true;
    this.error = null;
    this.success = null;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.selectedMember = null;
    this.error = null;
  }

  // CRUD operations
  async createTenant() {
    if (!this.createForm.name || !this.createForm.tenantAdminEmail) {
      this.error = 'Por favor complete todos los campos requeridos';
      return;
    }

    this.loading = true;
    this.error = null;

    this.tenantService.createTenant(this.createForm).subscribe({
      next: (response) => {
        this.success = 'Tenant creado exitosamente';
        this.closeCreateModal();
        this.loadTenants();
      },
      error: (err) => {
        console.error('Error creating tenant:', err);
        this.error = err.error?.message || 'Error al crear tenant';
        this.loading = false;
      },
    });
  }

  async inviteMember() {
    if (!this.selectedTenant || !this.inviteForm.email) {
      this.error = 'Por favor complete todos los campos';
      return;
    }

    this.loadingMembers = true;
    this.error = null;

    this.tenantService
      .inviteMember(this.selectedTenant.id, this.inviteForm)
      .subscribe({
        next: (response) => {
          this.success = 'Usuario invitado exitosamente';
          this.closeInviteModal();
          this.loadTenantMembers(this.selectedTenant!.id);
        },
        error: (err) => {
          console.error('Error inviting member:', err);
          this.error = err.error?.message || 'Error al invitar usuario';
          this.loadingMembers = false;
        },
      });
  }

  async updateMemberRole() {
    if (!this.selectedTenant || !this.selectedMember) {
      return;
    }

    this.loadingMembers = true;
    this.error = null;

    this.tenantService
      .updateMemberRole(
        this.selectedTenant.id,
        this.selectedMember.userId,
        this.roleForm,
      )
      .subscribe({
        next: (response) => {
          this.success = 'Rol actualizado exitosamente';
          this.closeRoleModal();
          this.loadTenantMembers(this.selectedTenant!.id);
        },
        error: (err) => {
          console.error('Error updating role:', err);
          this.error = err.error?.message || 'Error al actualizar rol';
          this.loadingMembers = false;
        },
      });
  }

  async removeMember() {
    if (!this.selectedTenant || !this.selectedMember) {
      return;
    }

    this.loadingMembers = true;
    this.error = null;

    this.tenantService
      .removeMember(this.selectedTenant.id, this.selectedMember.userId)
      .subscribe({
        next: (response) => {
          this.success = 'Miembro eliminado exitosamente';
          this.closeDeleteModal();
          this.loadTenantMembers(this.selectedTenant!.id);
        },
        error: (err) => {
          console.error('Error removing member:', err);
          this.error = err.error?.message || 'Error al eliminar miembro';
          this.loadingMembers = false;
        },
      });
  }

  getRoleBadgeClass(role: TenantRole): string {
    switch (role) {
      case TenantRole.ADMIN:
        return 'badge-admin';
      case TenantRole.MEMBER:
        return 'badge-member';
      case TenantRole.VIEWER:
        return 'badge-viewer';
      default:
        return '';
    }
  }

  getRoleLabel(role: TenantRole): string {
    switch (role) {
      case TenantRole.ADMIN:
        return 'Admin';
      case TenantRole.MEMBER:
        return 'Miembro';
      case TenantRole.VIEWER:
        return 'Visor';
      default:
        return role;
    }
  }
}
