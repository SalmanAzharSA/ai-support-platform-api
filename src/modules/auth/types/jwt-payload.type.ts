import { UserRole } from '../../users/entities/users.entity';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};
