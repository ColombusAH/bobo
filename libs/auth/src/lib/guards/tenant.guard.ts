import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtPayload } from '../interfaces/auth.interface';

@Injectable()
export class TenantGuard implements CanActivate {

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has tenant context
    if (!user.tenantId) {
      throw new ForbiddenException('No tenant context. Please select a tenant.');
    }

    // Attach tenant to request for easy access
    request.tenantId = user.tenantId;

    return true;
  }
}

