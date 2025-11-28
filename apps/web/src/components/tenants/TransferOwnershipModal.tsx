import { useState, useCallback, useMemo } from 'react';
import { TenantMember } from '../../hooks/tenant.hooks';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatMemberName } from '../../utils/tenant.utils';

interface TransferOwnershipModalProps {
  isOpen: boolean;
  targetMember: TenantMember | null;
  members?: TenantMember[];
  onClose: () => void;
  onTransfer: (newOwnerId: string) => void;
  isSubmitting: boolean;
}

export function TransferOwnershipModal({
  isOpen,
  targetMember,
  members = [],
  onClose,
  onTransfer,
  isSubmitting,
}: TransferOwnershipModalProps) {
  const [selectedUserId, setSelectedUserId] = useState('');

  const showSelection = !targetMember;

  const eligibleMembers = useMemo(
    () => members.filter((m) => m.role !== 'OWNER'),
    [members]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const newOwnerId = targetMember ? targetMember.userId : selectedUserId;
      if (newOwnerId) {
        onTransfer(newOwnerId);
      }
    },
    [targetMember, selectedUserId, onTransfer]
  );

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      setSelectedUserId('');
      onClose();
    }
  }, [isSubmitting, onClose]);

  const footer = (
    <>
      <Button
        type="submit"
        form="transfer-ownership-form"
        variant="warning"
        disabled={isSubmitting || (showSelection && !selectedUserId)}
        isLoading={isSubmitting}
        className="w-full sm:ml-3 sm:w-auto"
      >
        Transfer Ownership
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
      title="Transfer Ownership"
      footer={footer}
      size="md"
    >
      <form
        id="transfer-ownership-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div className="flex items-start">
          <div className="shrink-0">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
          <div className="ml-4 flex-1">
            {showSelection ? (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  Transferring ownership will make you an Admin. This action
                  cannot be undone. Select the new owner:
                </p>
                <div>
                  <label
                    htmlFor="newOwner"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Select New Owner
                  </label>
                  <select
                    id="newOwner"
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    disabled={isSubmitting}
                  >
                    <option value="">Choose a member...</option>
                    {eligibleMembers.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {formatMemberName(member)} ({member.email})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Transferring ownership to{' '}
                <strong className="font-medium text-gray-900">
                  {formatMemberName(targetMember)}
                </strong>{' '}
                will make them the new owner. You will become an Admin. This
                action cannot be undone.
              </p>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}

