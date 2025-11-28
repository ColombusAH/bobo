import { useState, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ROLE_DESCRIPTIONS, TenantRole } from '../../utils/tenant.utils';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (data: { email: string; role: TenantRole }) => void;
  isSubmitting: boolean;
}

export function InviteUserModal({
  isOpen,
  onClose,
  onInvite,
  isSubmitting,
}: InviteUserModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TenantRole>('MEMBER');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        return;
      }

      onInvite({ email, role });
    },
    [email, role, onInvite]
  );

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      setEmail('');
      setRole('MEMBER');
      setError(null);
      onClose();
    }
  }, [isSubmitting, onClose]);

  const footer = (
    <>
      <Button
        type="submit"
        form="invite-form"
        disabled={isSubmitting || !email.trim()}
        isLoading={isSubmitting}
        className="w-full sm:ml-3 sm:w-auto"
      >
        Send Invitation
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
      title="Invite Team Member"
      footer={footer}
      size="md"
    >
      <form id="invite-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email Address
          </label>
          <input
            type="email"
            id="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="user@example.com"
            autoComplete="email"
            disabled={isSubmitting}
          />
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={isSubmitting}
          >
            <option value="ADMIN">Admin</option>
            <option value="MEMBER">Member</option>
            <option value="GUEST">Guest</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {ROLE_DESCRIPTIONS[role]}
          </p>
        </div>
      </form>
    </Modal>
  );
}

