import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../entities/user.entity";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    console.log("🔒 [ROLES-GUARD] Required roles:", requiredRoles);

    if (!requiredRoles) {
      console.log("✅ [ROLES-GUARD] No roles required, access granted");
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    console.log("👤 [ROLES-GUARD] User:", {
      id: user?.id,
      email: user?.email,
      role: user?.role,
      hasUser: !!user,
    });

    if (!user) {
      console.log("❌ [ROLES-GUARD] No user in request, access denied");
      return false;
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    console.log("🔍 [ROLES-GUARD] Role check:", {
      userRole: user.role,
      requiredRoles,
      hasRole,
    });

    return hasRole;
  }
}
