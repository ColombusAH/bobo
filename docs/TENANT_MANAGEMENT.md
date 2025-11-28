# Tenant Management System

## Overview

Complete tenant user management system with backend API and React UI for inviting, managing, and removing team members in a multi-tenant SaaS application.

## Features

✅ **Invite Users** - Send email invitations to join tenant  
✅ **View Members** - List all tenant members with roles and status  
✅ **Update Roles** - Change member roles (ADMIN, MEMBER, GUEST)  
✅ **Remove Members** - Remove users from tenant  
✅ **Transfer Ownership** - Transfer tenant ownership to another member  
✅ **Leave Tenant** - Self-removal from tenant  
✅ **Role-Based Access** - Only OWNER/ADMIN can manage members  
✅ **Security** - Prevents owner removal, validates permissions  

---

## Backend API

### Endpoints

#### Get Tenant Members
```http
GET /tenants/members
Authorization: Bearer {token}
```
**Required Role:** OWNER or ADMIN

**Response:**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "avatarUrl": "https://...",
    "role": "MEMBER",
    "permissions": [],
    "isActive": true,
    "invitedBy": "uuid",
    "invitedAt": "2025-11-15T10:00:00Z",
    "joinedAt": "2025-11-15T10:00:00Z",
    "lastLoginAt": "2025-11-15T12:00:00Z"
  }
]
```

#### Invite User
```http
POST /tenants/invite
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "newuser@example.com",
  "role": "MEMBER",
  "permissions": ["optional", "permissions"]
}
```
**Required Role:** OWNER or ADMIN

**Response:**
```json
{
  "invitationToken": "random-token-string"
}
```

#### Update Member
```http
PUT /tenants/members/:userId
Authorization: Bearer {token}
Content-Type: application/json

{
  "role": "ADMIN",
  "permissions": ["permission1", "permission2"],
  "isActive": true
}
```
**Required Role:** OWNER or ADMIN

#### Remove Member
```http
DELETE /tenants/members/:userId
Authorization: Bearer {token}
```
**Required Role:** OWNER or ADMIN  
**Restrictions:** Cannot remove OWNER

#### Transfer Ownership
```http
POST /tenants/transfer-ownership
Authorization: Bearer {token}
Content-Type: application/json

{
  "newOwnerId": "uuid"
}
```
**Required Role:** OWNER only

#### Leave Tenant
```http
POST /tenants/leave
Authorization: Bearer {token}
```
**Restrictions:** OWNER cannot leave (must transfer first)

---

## Frontend UI

### Route
- **Path:** `/tenants`
- **File:** `apps/web/src/routes/_protected.tenants.tsx`
- **Component:** `TenantMembersPage`

### Features

1. **Members Table**
   - Shows all tenant members
   - Displays role badges (OWNER, ADMIN, MEMBER, GUEST)
   - Shows status (Active/Pending)
   - Shows join date and last login

2. **Invite Modal**
   - Email input
   - Role selection (ADMIN, MEMBER, GUEST)
   - Role descriptions

3. **Edit Member Modal**
   - Update role
   - Toggle active status
   - Cannot change OWNER role

4. **Transfer Ownership Modal**
   - Select new owner from members
   - Warning about ownership transfer

### Components

- `TenantMembersPage` - Main page component
- `InviteUserModal` - Invite new members
- `EditMemberModal` - Edit member details
- `TransferOwnershipModal` - Transfer ownership

### Hooks

Located in `apps/web/src/hooks/tenant.hooks.ts`:

- `useTenantMembers()` - Fetch members
- `useInviteUser()` - Invite mutation
- `useUpdateMember()` - Update mutation
- `useRemoveMember()` - Remove mutation
- `useTransferOwnership()` - Transfer mutation
- `useLeaveTenant()` - Leave mutation

---

## Security Rules

### Role Permissions

| Action | OWNER | ADMIN | MEMBER | GUEST |
|--------|-------|-------|--------|-------|
| View Members | ✅ | ✅ | ❌ | ❌ |
| Invite Users | ✅ | ✅ | ❌ | ❌ |
| Update Members | ✅ | ✅ | ❌ | ❌ |
| Remove Members | ✅ | ✅ | ❌ | ❌ |
| Transfer Ownership | ✅ | ❌ | ❌ | ❌ |
| Change OWNER Role | ✅ | ❌ | ❌ | ❌ |

### Business Rules

1. **Owner Protection**
   - Cannot remove OWNER
   - Cannot change OWNER role (use transfer)
   - OWNER cannot leave (must transfer first)

2. **Admin Restrictions**
   - Admins cannot remove themselves
   - Admins cannot manage OWNER role
   - Admins cannot transfer ownership

3. **Invitation Flow**
   - Creates user if doesn't exist
   - Sets membership to inactive until accepted
   - Tracks who invited and when

---

## Usage Example

### Invite a User

```typescript
const { mutate: inviteUser } = useInviteUser();

inviteUser({
  email: 'newuser@example.com',
  role: 'MEMBER',
}, {
  onSuccess: () => {
    console.log('Invitation sent!');
  },
});
```

### Update Member Role

```typescript
const { mutate: updateMember } = useUpdateMember();

updateMember({
  userId: 'user-uuid',
  role: 'ADMIN',
}, {
  onSuccess: () => {
    console.log('Member updated!');
  },
});
```

### Remove Member

```typescript
const { mutate: removeMember } = useRemoveMember();

removeMember('user-uuid', {
  onSuccess: () => {
    console.log('Member removed!');
  },
});
```

---

## Database Schema

The system uses existing `TenantUser` model:

```prisma
model TenantUser {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  userId    String   @map("user_id")
  role      TenantRole @default(MEMBER)
  permissions Json?  @default("[]")
  isActive  Boolean  @default(true) @map("is_active")
  invitedBy String?  @map("invited_by")
  invitedAt DateTime? @map("invited_at")
  joinedAt  DateTime @default(now()) @map("joined_at")
  
  tenant    Tenant   @relation(...)
  user      User     @relation(...)
  
  @@unique([tenantId, userId])
}
```

---

## Navigation

The navigation bar includes a "Team" link that routes to `/tenants` for easy access to the tenant management page.

---

## Future Enhancements

- [ ] Email invitation service integration
- [ ] Invitation token verification endpoint
- [ ] Bulk invite (CSV upload)
- [ ] Member activity logs
- [ ] Permission templates
- [ ] Team member search/filter
- [ ] Export member list

---

**Created:** November 15, 2025  
**Version:** 1.0.0


