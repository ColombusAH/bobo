import { TenantMember } from '../hooks/tenant.hooks';

export type TenantRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';

export const ROLE_LABELS: Record<TenantRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  GUEST: 'Guest',
};

export const ROLE_DESCRIPTIONS: Record<TenantRole, string> = {
  OWNER: 'Full control over the workspace',
  ADMIN: 'Can manage members and settings',
  MEMBER: 'Full access to workspace features',
  GUEST: 'Limited read-only access',
};

export const getRoleBadgeColor = (role: TenantRole | string): string => {
  switch (role) {
    case 'OWNER':
      return 'bg-purple-100 text-purple-800';
    case 'ADMIN':
      return 'bg-blue-100 text-blue-800';
    case 'MEMBER':
      return 'bg-green-100 text-green-800';
    case 'GUEST':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const formatMemberName = (member: TenantMember): string => {
  if (member.firstName && member.lastName) {
    return `${member.firstName} ${member.lastName}`;
  }
  return member.email;
};

export const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const canManageMembers = (role: string | undefined): boolean => {
  return role === 'OWNER' || role === 'ADMIN';
};

export const isOwner = (role: string | undefined): boolean => {
  return role === 'OWNER';
};


