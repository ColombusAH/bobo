import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  UseGuards,
  Param,
} from '@nestjs/common';
import {
  TenantService,
  InviteUserDto,
  UpdateMemberDto,
  RemoveMemberDto,
  TransferOwnershipDto,
  JwtAuthGuard,
  TenantGuard,
  RolesGuard,
  CurrentUser,
  Roles,
} from '@org/auth';

import type { JwtPayload } from '@org/auth';

@Controller('tenants')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TenantsController {
  constructor(private readonly tenantService: TenantService) {}

  /**
   * Get current tenant members
   * GET /tenants/members
   */
  @Get('members')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async getMembers(@CurrentUser() user: JwtPayload) {
    if (!user.tenantId) {
      throw new Error('No tenant context');
    }
    return this.tenantService.getTenantMembers(user.tenantId, user.sub);
  }

  /**
   * Invite user to tenant
   * POST /tenants/invite
   */
  @Post('invite')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async inviteUser(
    @CurrentUser() user: JwtPayload,
    @Body() dto: InviteUserDto,
  ) {
    if (!user.tenantId) {
      throw new Error('No tenant context');
    }
    return this.tenantService.inviteUser(user.tenantId, user.sub, dto);
  }

  /**
   * Update member
   * PUT /tenants/members/:userId
   */
  @Put('members/:userId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async updateMember(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    if (!user.tenantId) {
      throw new Error('No tenant context');
    }
    return this.tenantService.updateMember(user.tenantId, user.sub, {
      ...dto,
      userId,
    });
  }

  /**
   * Remove member
   * DELETE /tenants/members/:userId
   */
  @Delete('members/:userId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ) {
    if (!user.tenantId) {
      throw new Error('No tenant context');
    }
    return this.tenantService.removeMember(user.tenantId, user.sub, {
      userId,
    });
  }

  /**
   * Transfer ownership
   * POST /tenants/transfer-ownership
   */
  @Post('transfer-ownership')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  async transferOwnership(
    @CurrentUser() user: JwtPayload,
    @Body() dto: TransferOwnershipDto,
  ) {
    if (!user.tenantId) {
      throw new Error('No tenant context');
    }
    return this.tenantService.transferOwnership(
      user.tenantId,
      user.sub,
      dto,
    );
  }

  /**
   * Leave tenant
   * POST /tenants/leave
   */
  @Post('leave')
  async leaveTenant(@CurrentUser() user: JwtPayload) {
    if (!user.tenantId) {
      throw new Error('No tenant context');
    }
    return this.tenantService.leaveTenant(user.tenantId, user.sub);
  }

  /**
   * Get user's tenants
   * GET /tenants/my-tenants
   */
  @Get('my-tenants')
  async getMyTenants(@CurrentUser('sub') userId: string) {
    return this.tenantService.getUserTenants(userId);
  }
}

