import { useState, useCallback, useMemo } from 'react';
import {
  useTenantMembers,
  useInviteUser,
  useUpdateMember,
  useRemoveMember,
  useTransferOwnership,
  TenantMember,
} from '../../hooks/tenant.hooks';
import { InviteUserModal } from './InviteUserModal';
import { EditMemberModal } from './EditMemberModal';
import { TransferOwnershipModal } from './TransferOwnershipModal';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import {
  getRoleBadgeColor,
  formatMemberName,
  formatDate,
  canManageMembers,
  isOwner,
  TenantRole,
} from '../../utils/tenant.utils';

interface TenantMembersPageProps {
  routeContext?: {
    auth?: {
      user?: {
        id?: string;
        role?: string;
        [key: string]: unknown;
      };
    };
  };
}

export function TenantMembersPage({ routeContext }: TenantMembersPageProps = {}) {
  const { data: members, isLoading, error } = useTenantMembers();
  const { mutate: inviteUser, isPending: isInviting } = useInviteUser();
  const { mutate: updateMember, isPending: isUpdating } = useUpdateMember();
  const { mutate: removeMember } = useRemoveMember();
  const { mutate: transferOwnership, isPending: isTransferring } =
    useTransferOwnership();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TenantMember | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState<TenantMember | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  // Get current user from route context
  const currentUser = routeContext?.auth?.user;
  const currentUserRole = (currentUser?.role as string) || 'MEMBER';
  const canManage = useMemo(
    () => canManageMembers(currentUserRole),
    [currentUserRole]
  );
  const isCurrentUserOwner = useMemo(
    () => isOwner(currentUserRole),
    [currentUserRole]
  );

  const handleInvite = useCallback(
    (data: { email: string; role: TenantRole }) => {
      inviteUser(
        {
          email: data.email,
          role: data.role,
        },
        {
          onSuccess: () => {
            setShowInviteModal(false);
          },
          onError: (error) => {
            console.error('Failed to invite user:', error);
          },
        }
      );
    },
    [inviteUser]
  );

  const handleUpdate = useCallback(
    (memberId: string, data: { role?: TenantRole; isActive?: boolean }) => {
      updateMember(
        {
          userId: memberId,
          ...data,
        },
        {
          onSuccess: () => {
            setEditingMember(null);
          },
          onError: (error) => {
            console.error('Failed to update member:', error);
          },
        }
      );
    },
    [updateMember]
  );

  const handleRemove = useCallback(
    (userId: string, memberName: string) => {
      if (
        window.confirm(
          `Are you sure you want to remove ${memberName}? This action cannot be undone.`
        )
      ) {
        setRemovingUserId(userId);
        removeMember(userId, {
          onSuccess: () => {
            setRemovingUserId(null);
          },
          onError: (error) => {
            console.error('Failed to remove member:', error);
            setRemovingUserId(null);
          },
        });
      }
    },
    [removeMember]
  );

  const handleTransfer = useCallback(
    (newOwnerId: string) => {
      transferOwnership(newOwnerId, {
        onSuccess: () => {
          setShowTransferModal(false);
          setTransferTarget(null);
        },
        onError: (error) => {
          console.error('Failed to transfer ownership:', error);
        },
      });
    },
    [transferOwnership]
  );

  const handleOpenEditModal = useCallback((member: TenantMember) => {
    setEditingMember(member);
  }, []);

  const handleOpenTransferModal = useCallback(
    (member: TenantMember | null) => {
      setTransferTarget(member);
      setShowTransferModal(true);
    },
    []
  );

  const handleCloseInviteModal = useCallback(() => {
    setShowInviteModal(false);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditingMember(null);
  }, []);

  const handleCloseTransferModal = useCallback(() => {
    setShowTransferModal(false);
    setTransferTarget(null);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading members..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Failed to load members
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const membersList = members || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Team Members
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Manage members and their roles in your workspace
                  </p>
                </div>
                {canManage && (
                  <Button onClick={() => setShowInviteModal(true)}>
                    <svg
                      className="-ml-1 mr-2 h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Invite Member
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Members List */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              {membersList.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No members
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by inviting a new member to your workspace.
                  </p>
                  {canManage && (
                    <div className="mt-6">
                      <Button onClick={() => setShowInviteModal(true)}>
                        Invite Member
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                        {canManage && (
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {membersList.map((member) => {
                        const isMemberOwner = member.role === 'OWNER';
                        const isCurrentMember = member.userId === currentUser?.id;
                        const isRemoving = removingUserId === member.userId;

                        return (
                          <tr key={member.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="shrink-0 h-10 w-10">
                                  {member.avatarUrl ? (
                                    <img
                                      className="h-10 w-10 rounded-full"
                                      src={member.avatarUrl}
                                      alt={formatMemberName(member)}
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                      <span className="text-gray-600 font-medium">
                                        {member.firstName?.[0] ||
                                          member.email[0].toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {formatMemberName(member)}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {member.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                                  member.role
                                )}`}
                              >
                                {member.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {member.isActive ? (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(member.joinedAt)}
                            </td>
                            {canManage && (
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-2">
                                  {!isMemberOwner && (
                                    <>
                                      <button
                                        onClick={() => handleOpenEditModal(member)}
                                        disabled={isRemoving}
                                        className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                                        aria-label={`Edit ${formatMemberName(member)}`}
                                      >
                                        Edit
                                      </button>
                                      {isCurrentUserOwner && (
                                        <button
                                          onClick={() =>
                                            handleOpenTransferModal(member)
                                          }
                                          disabled={isRemoving}
                                          className="text-purple-600 hover:text-purple-900 disabled:opacity-50"
                                          aria-label={`Transfer ownership to ${formatMemberName(member)}`}
                                        >
                                          Make Owner
                                        </button>
                                      )}
                                      {!isCurrentMember && (
                                        <button
                                          onClick={() =>
                                            handleRemove(
                                              member.userId,
                                              formatMemberName(member)
                                            )
                                          }
                                          disabled={isRemoving}
                                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                          aria-label={`Remove ${formatMemberName(member)}`}
                                        >
                                          {isRemoving ? 'Removing...' : 'Remove'}
                                        </button>
                                      )}
                                    </>
                                  )}
                                  {isMemberOwner &&
                                    isCurrentUserOwner &&
                                    isCurrentMember && (
                                      <button
                                        onClick={() =>
                                          handleOpenTransferModal(null)
                                        }
                                        disabled={isTransferring}
                                        className="text-purple-600 hover:text-purple-900 disabled:opacity-50"
                                        aria-label="Transfer ownership"
                                      >
                                        Transfer Ownership
                                      </button>
                                    )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={handleCloseInviteModal}
        onInvite={handleInvite}
        isSubmitting={isInviting}
      />

      <EditMemberModal
        isOpen={!!editingMember}
        member={editingMember}
        onClose={handleCloseEditModal}
        onUpdate={handleUpdate}
        isSubmitting={isUpdating}
      />

      <TransferOwnershipModal
        isOpen={showTransferModal}
        targetMember={transferTarget}
        members={membersList}
        onClose={handleCloseTransferModal}
        onTransfer={handleTransfer}
        isSubmitting={isTransferring}
      />
    </div>
  );
}
