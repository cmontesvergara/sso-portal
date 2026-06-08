/**
 * System Role Enum
 * Controls who can manage the application catalog (system-level)
 */
export enum SystemRole {
  SUPER_ADMIN = 'super_admin',
  SYSTEM_ADMIN = 'system_admin',
  USER = 'user',
}

/**
 * Tenant Role Enum
 * Controls who can manage apps within a tenant (tenant-level)
 */
export enum TenantRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

/**
 * User Status Enum
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

/**
 * Application model
 */
export interface Application {
  id: string;
  appId: string;
  name: string;
  url: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * User with System Role
 */
export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  systemRole: SystemRole;
  userStatus: UserStatus;
  isActive: boolean;
  createdAt: string;
}

/**
 * Tenant Member
 */
export interface TenantMember {
  id: string;
  userId: string;
  tenantId: string;
  role: TenantRole;
  joinedAt: string;
  user?: User;
}

/**
 * Tenant with details
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  members?: TenantMember[];
}

/**
 * Tenant with Apps (for dashboard)
 */
export interface TenantWithApps {
  tenantId: string;
  name: string;
  slug: string;
  role: TenantRole;
  apps: Array<{
    appId: string;
    name: string;
    url: string;
    description: string | null;
  }>;
}

/**
 * User Profile Extended
 */
export interface UserProfile {
  userId: string;
  email: string;
  firstName: string;
  secondName?: string;
  lastName: string;
  secondLastName?: string;
  phone: string;
  nuid: string;
  birthDate?: string;
  gender?: string;
  nationality?: string;
  birthPlace?: string;
  placeOfResidence?: string;
  occupation?: string;
  maritalStatus?: string;
  userStatus: UserStatus;
  systemRole: SystemRole;
  isActive: boolean;
  createdAt: string;
  addresses?: Address[];
}

export interface Address {
  id: string;
  country: string;
  province: string;
  city: string;
  detail: string;
  postalCode?: string;
}

/**
 * API Response wrappers
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Tenant models
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  memberCount?: number;
  roleCount?: number;
  createdAt: string;
  role?: TenantRole;
}

export interface TenantMember {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: TenantRole;
  joinedAt: string;
}

export interface CreateTenantDto {
  name: string;
  slug?: string;
  tenantAdminEmail: string;
}

export interface InviteTenantMemberDto {
  email: string;
  role: TenantRole;
}

export interface UpdateMemberRoleDto {
  role: TenantRole;
}

/**
 * Custom Role models
 */
export interface CustomRole {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  applicationId: string;
  applicationName: string;
  appId: string;
  resource: string;
  action: string;
  createdAt: string;
}

export interface CreateRoleDto {
  name: string;
  tenantId: string;
}

export interface UpdateRoleDto {
  name?: string;
}

export interface CreatePermissionDto {
  applicationId: string;
  resource: string;
  action: string;
}

/**
 * App Resource models
 */
export interface AppResource {
  resource: string;
  action: string;
  category: string | null;
  description: string | null;
  applicationName: string;
  appId: string;
}

export interface RegisterAppResourcesDto {
  appId: string;
  resources: Array<{
    resource: string;
    action: string;
    category?: string;
    description?: string;
  }>;
}
