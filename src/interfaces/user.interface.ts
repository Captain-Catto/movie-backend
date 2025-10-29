import { UserRole } from "../entities/user.entity";

export interface UserResponse {
  id: number;
  email: string;
  name: string; // Username/Display name
  image?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
