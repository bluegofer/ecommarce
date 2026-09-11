import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Attach required roles to a route handler or controller.
 * Enforced server-side by RolesGuard (never trust the UI).
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);