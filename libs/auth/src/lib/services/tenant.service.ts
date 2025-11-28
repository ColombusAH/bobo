import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '@org/db';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import {
  InviteUserDto,
  UpdateMemberDto,
  RemoveMemberDto,
  TransferOwnershipDto,
  TenantRole,
} from '../dto/tenant.dto';
import { PRISMA_SERVICE } from './auth.service';

@Injectable()
export class TenantService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaService) {}

  /**
   * Get tenant members
   */
  async getTenantMembers(tenantId: string, userId: string) {
    // Verify user has access to tenant
    const tenantUser = await this.verifyTenantAccess(tenantId, userId);

    // Only OWNER and ADMIN can view members
    if (!['OWNER', 'ADMIN'].includes(tenantUser.role)) {
      throw new ForbiddenException(
        'Only owners and admins can view tenant members',
      );
    }

    const members = await this.prisma.tenantUser.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // OWNER first, then ADMIN, etc.
        { joinedAt: 'desc' },
      ],
    });

    return members.map((member: {
      id: string;
      userId: string;
      role: TenantRole;
      permissions: unknown;
      isActive: boolean;
      invitedBy: string | null;
      invitedAt: Date | null;
      joinedAt: Date;
      user: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
      };
    }) => ({
      id: member.id,
      userId: member.userId,
      email: member.user.email,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      avatarUrl: member.user.avatarUrl,
      role: member.role,
      permissions: (member.permissions as string[]) || [],
      isActive: member.isActive && member.user.isActive,
      invitedBy: member.invitedBy,
      invitedAt: member.invitedAt,
      joinedAt: member.joinedAt,
      lastLoginAt: member.user.lastLoginAt,
    }));
  }

  /**
   * Invite user to tenant
   */
  async inviteUser(
    tenantId: string,
    inviterId: string,
    dto: InviteUserDto,
  ): Promise<{ invitationToken: string }> {
    // Verify inviter has permission
    const inviter = await this.verifyTenantAccess(tenantId, inviterId);

    if (!['OWNER', 'ADMIN'].includes(inviter.role)) {
      throw new ForbiddenException(
        'Only owners and admins can invite users',
      );
    }

    // Check if user already exists
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Check if user is already a member
    if (user) {
      const existingMember = await this.prisma.tenantUser.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: user.id,
          },
        },
      });

      if (existingMember) {
        throw new ConflictException('User is already a member of this tenant');
      }
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(invitationToken)
      .digest('hex');

    // Store invitation (create user if doesn't exist)
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (!user) {
        // Create user account (they'll set password when accepting)
        user = await tx.user.create({
          data: {
            email: dto.email,
            isActive: true,
            isVerified: false,
            emailVerified: false,
          },
        });
      }

      // Create tenant user relationship (inactive until accepted)
      await tx.tenantUser.create({
        data: {
          tenantId,
          userId: user.id,
          role: dto.role,
          permissions: dto.permissions || [],
          isActive: false, // Inactive until invitation is accepted
          invitedBy: inviterId,
          invitedAt: new Date(),
        },
      });

      // Store invitation token (you might want a separate Invitation model)
      // For now, we'll use a simple approach with tenantUser metadata
      // In production, consider a dedicated Invitation table
    });

    // TODO: Send invitation email with token
    // await this.emailService.sendInvitation(dto.email, invitationToken, tenantId);

    return { invitationToken };
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(
    userId: string,
    token: string,
  ): Promise<{ success: boolean; tenantId: string }> {
    // In production, verify token from Invitation table
    // For now, we'll find pending invitations for this user
    const tenantUser = await this.prisma.tenantUser.findFirst({
      where: {
        userId,
        isActive: false,
        invitedAt: { not: null },
      },
      include: {
        tenant: true,
      },
    });

    if (!tenantUser) {
      throw new NotFoundException('No pending invitation found');
    }

    // Activate membership
    await this.prisma.tenantUser.update({
      where: { id: tenantUser.id },
      data: {
        isActive: true,
        joinedAt: new Date(),
      },
    });

    return {
      success: true,
      tenantId: tenantUser.tenantId,
    };
  }

  /**
   * Update member role/permissions
   */
  async updateMember(
    tenantId: string,
    updaterId: string,
    dto: UpdateMemberDto,
  ) {
    // Verify updater has permission
    const updater = await this.verifyTenantAccess(tenantId, updaterId);

    if (!['OWNER', 'ADMIN'].includes(updater.role)) {
      throw new ForbiddenException(
        'Only owners and admins can update members',
      );
    }

    // Prevent changing OWNER role (use transferOwnership instead)
    const member = await this.prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: dto.userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === 'OWNER' && dto.role && dto.role !== 'OWNER') {
      throw new BadRequestException(
        'Cannot change owner role. Use transfer ownership instead.',
      );
    }

    // Prevent non-owners from changing roles to/from OWNER
    if (updater.role !== 'OWNER' && (dto.role === 'OWNER' || member.role === 'OWNER')) {
      throw new ForbiddenException('Only owners can manage owner role');
    }

    // Update member
    const updateData: Prisma.TenantUserUpdateInput = {};
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.permissions !== undefined) updateData.permissions = dto.permissions;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.tenantUser.update({
      where: { id: member.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Remove member from tenant
   */
  async removeMember(
    tenantId: string,
    removerId: string,
    dto: RemoveMemberDto,
  ) {
    // Verify remover has permission
    const remover = await this.verifyTenantAccess(tenantId, removerId);

    if (!['OWNER', 'ADMIN'].includes(remover.role)) {
      throw new ForbiddenException(
        'Only owners and admins can remove members',
      );
    }

    // Prevent removing owner
    const member = await this.prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: dto.userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === 'OWNER') {
      throw new BadRequestException('Cannot remove owner. Transfer ownership first.');
    }

    // Prevent self-removal for admins
    if (removerId === dto.userId && remover.role === 'ADMIN') {
      throw new BadRequestException('Admins cannot remove themselves');
    }

    // Remove member
    await this.prisma.tenantUser.delete({
      where: { id: member.id },
    });

    return { success: true };
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(
    tenantId: string,
    currentOwnerId: string,
    dto: TransferOwnershipDto,
  ) {
    // Verify current user is owner
    const currentOwner = await this.verifyTenantAccess(tenantId, currentOwnerId);

    if (currentOwner.role !== 'OWNER') {
      throw new ForbiddenException('Only the current owner can transfer ownership');
    }

    // Verify new owner is a member
    const newOwner = await this.prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: dto.newOwnerId,
        },
      },
    });

    if (!newOwner) {
      throw new NotFoundException('New owner is not a member of this tenant');
    }

    // Transfer ownership in transaction
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Demote current owner to ADMIN
      await tx.tenantUser.update({
        where: { id: currentOwner.id },
        data: { role: 'ADMIN' },
      });

      // Promote new owner
      await tx.tenantUser.update({
        where: { id: newOwner.id },
        data: { role: 'OWNER' },
      });
    });

    return { success: true };
  }

  /**
   * Leave tenant (self-removal)
   */
  async leaveTenant(tenantId: string, userId: string) {
    const member = await this.verifyTenantAccess(tenantId, userId);

    // Prevent owner from leaving
    if (member.role === 'OWNER') {
      throw new BadRequestException(
        'Owner cannot leave tenant. Transfer ownership first.',
      );
    }

    await this.prisma.tenantUser.delete({
      where: { id: member.id },
    });

    return { success: true };
  }

  /**
   * Get user's tenants
   */
  async getUserTenants(userId: string) {
    const tenantUsers = await this.prisma.tenantUser.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            isActive: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return tenantUsers.map((tu: {
      tenantId: string;
      role: TenantRole;
      permissions: unknown;
      joinedAt: Date;
      tenant: {
        id: string;
        name: string;
        slug: string;
        plan: string;
        isActive: boolean;
      };
    }) => ({
      tenantId: tu.tenantId,
      tenantName: tu.tenant.name,
      tenantSlug: tu.tenant.slug,
      plan: tu.tenant.plan,
      role: tu.role,
      permissions: (tu.permissions as string[]) || [],
      joinedAt: tu.joinedAt,
    }));
  }

  /**
   * Verify user has access to tenant
   */
  private async verifyTenantAccess(
    tenantId: string,
    userId: string,
  ): Promise<{ id: string; role: TenantRole; userId: string }> {
    const tenantUser = await this.prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
    });

    if (!tenantUser || !tenantUser.isActive) {
      throw new UnauthorizedException('Access to this tenant is denied');
    }

    return tenantUser;
  }
}
