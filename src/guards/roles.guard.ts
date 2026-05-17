import { Injectable, CanActivate, ExecutionContext, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../entities/user.entity";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    this.logger.debug(`Required roles: ${requiredRoles?.join(", ") || "none"}`);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    this.logger.debug(`User role check: ${JSON.stringify({
      id: user?.id,
      email: user?.email,
      role: user?.role,
      hasUser: !!user,
    })}`);

    if (!user) {
      this.logger.warn("No user in request, access denied");
      return false;
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    this.logger.debug(`Role check: ${JSON.stringify({
      userRole: user.role,
      requiredRoles,
      hasRole,
    })}`);

    return hasRole;
  }
}
