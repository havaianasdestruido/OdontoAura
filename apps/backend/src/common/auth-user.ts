import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  // TODO: add optional sessionId or deviceId field to support per-device token revocation
  role: Role;
}