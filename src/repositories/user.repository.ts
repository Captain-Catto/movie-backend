import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../entities/user.entity";

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private repository: Repository<User>
  ) {}

  async findByEmail(email: string): Promise<User> {
    return this.repository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User> {
    return this.repository.findOne({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    console.log("📋 [USER-REPO] Fetching all users...");
    try {
      const users = await this.repository.find({
        order: { createdAt: "DESC" },
      });
      console.log(`📊 [USER-REPO] Found ${users.length} users`);
      return users;
    } catch (error) {
      console.error("❌ [USER-REPO] Error fetching users:", error);
      throw error;
    }
  }

  async create(userData: Partial<User>): Promise<User> {
    console.log("💾 [USER-REPO] Creating user in database:", {
      email: userData.email,
      provider: userData.provider,
      hasPassword: !!userData.password,
      hasGoogleId: !!userData.googleId,
    });

    try {
      const user = this.repository.create(userData);
      const savedUser = await this.repository.save(user);

      console.log("✅ [USER-REPO] User saved to database:", {
        id: savedUser.id,
        email: savedUser.email,
        createdAt: savedUser.createdAt,
      });

      return savedUser;
    } catch (error) {
      console.error("❌ [USER-REPO] Failed to create user:", {
        error: error.message,
        userData: userData,
      });
      throw error;
    }
  }

  async update(id: number, userData: Partial<User>): Promise<User> {
    console.log("🔄 [USER-REPO] Updating user in database:", {
      id,
      updateData: userData,
    });

    try {
      await this.repository.update(id, userData);
      const updatedUser = await this.findById(id);

      console.log("✅ [USER-REPO] User updated successfully:", {
        id: updatedUser.id,
        email: updatedUser.email,
        provider: updatedUser.provider,
      });

      return updatedUser;
    } catch (error) {
      console.error("❌ [USER-REPO] Failed to update user:", {
        id,
        error: error.message,
        userData,
      });
      throw error;
    }
  }
}
