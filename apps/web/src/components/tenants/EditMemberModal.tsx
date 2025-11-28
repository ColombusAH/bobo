import { useState, useEffect, useCallback } from 'react';
import { TenantMember } from '../../hooks/tenant.hooks';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatMemberName, TenantRole } from '../../utils/tenant.utils';

interface EditMemberModalProps {
  isOpen: boolean;
  member: TenantMember | null;
  onClose: () => void;
  onUpdate: (memberId: string, data: { role?: TenantRole; isActive?: boolean }) => void;
  isSubmitting: boolean;
}

export function EditMemberModal({
  isOpen,
  member,
  onClose,
  onUpdate,
  isSubmitting,
}: EditMemberModalProps) {
  const [role, setRole] = useState<TenantRole>('MEMBER');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (member) {
      setRole(member.role);
      setIsActive(member.isActive);
    }
  }, [member]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!member) return;
      onUpdate(member.userId, { role, isActive });
    },
    [member, role, isActive, onUpdate]
  );

  const handleClose = useCallback(() => {
    if (!isSubmitting && member) {
      setRole(member.role);
      setIsActive(member.isActive);
      onClose();
    }
  }, [isSubmitting, member, onClose]);

  if (!member) return null;

  const isOwner = member.role === 'OWNER';

  const footer = (
    <>
      <Button
        type="submit"
        form="edit-member-form"
        disabled={isSubmitting}
        isLoading={isSubmitting}
        className="w-full sm:ml-3 sm:w-auto"
      >
        Save Changes
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={handleClose}
        disabled={isSubmitting}
        className="mt-3 w-full sm:mt-0 sm:w-auto"
      >
        Cancel
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Member"
      footer={footer}
      size="md"
    >
      <form id="edit-member-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Member
          </label>
          <div className="mt-1 text-sm text-gray-900">
            {formatMemberName(member)}
          </div>
          <div className="mt-1 text-xs text-gray-500">{member.email}</div>
        </div>

        <div>
          <label
            htmlFor="role"
            className="block text-sm font-medium text-gray-700"
          >
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as TenantRole)}
            disabled={isOwner || isSubmitting}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="OWNER">Owner</option>
            <option value="ADMIN">Admin</option>
            <option value="MEMBER">Member</option>
            <option value="GUEST">Guest</option>
          </select>
          {isOwner && (
            <p className="mt-1 text-xs text-yellow-600">
              Owner role cannot be changed. Use transfer ownership instead.
            </p>
          )}
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isSubmitting}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Active</span>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Inactive members cannot access the workspace
          </p>
        </div>
      </form>
    </Modal>
  );
}

