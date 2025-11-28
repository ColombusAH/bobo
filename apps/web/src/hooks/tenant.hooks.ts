import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

// Types
export interface TenantMember {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  permissions: string[];
  isActive: boolean;
  invitedBy: string | null;
  invitedAt: Date | null;
  joinedAt: Date;
  lastLoginAt: Date | null;
}

export interface InviteUserDto {
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  permissions?: string[];
}

export interface UpdateMemberDto {
  userId: string;
  role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  permissions?: string[];
  isActive?: boolean;
}

/**
 * Get tenant members
 */
export const useTenantMembers = () => {
  return useQuery({
    queryKey: ['tenants', 'members'],
    queryFn: async (): Promise<TenantMember[]> => {
      const response = await api.get<TenantMember[]>('/tenants/members');
      return response.data;
    },
  });
};

/**
 * Invite user to tenant
 */
export const useInviteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InviteUserDto) => {
      const response = await api.post<{ invitationToken: string }>(
        '/tenants/invite',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'members'] });
    },
  });
};

/**
 * Update member
 */
export const useUpdateMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateMemberDto) => {
      const response = await api.put(`/tenants/members/${data.userId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'members'] });
    },
  });
};

/**
 * Remove member
 */
export const useRemoveMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.delete(`/tenants/members/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'members'] });
    },
  });
};

/**
 * Transfer ownership
 */
export const useTransferOwnership = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newOwnerId: string) => {
      const response = await api.post('/tenants/transfer-ownership', {
        newOwnerId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'members'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
};

/**
 * Leave tenant
 */
export const useLeaveTenant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/tenants/leave');
      return response.data;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
};


