import { Controller, Get, Post, Body } from "@nestjs/common";
import { UserRepository } from "../repositories/user.repository";

@Controller("debug")
export class DebugController {
  constructor(private userRepository: UserRepository) {}

  @Post("test-body")
  async testRequestBody(@Body() body: any) {
    console.log("🧪 [DEBUG] Test request body received:", {
      type: typeof body,
      keys: Object.keys(body || {}),
      data: JSON.stringify(body, null, 2),
    });

    return {
      success: true,
      message: "Body received",
      data: {
        type: typeof body,
        keys: Object.keys(body || {}),
        body: body,
      },
    };
  }

  @Get("users")
  async getUsers() {
    try {
      console.log("🔍 [DEBUG] Fetching all users from database...");

      // Get all users
      const users = await this.userRepository.findAll();

      console.log("📊 [DEBUG] Users found:", {
        count: users.length,
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          provider: u.provider,
          createdAt: u.createdAt,
        })),
      });

      return {
        success: true,
        data: {
          count: users.length,
          users: users.map((user) => ({
            id: user.id,
            email: user.email,
            name: user.name,
            provider: user.provider,
            googleId: user.googleId,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          })),
        },
      };
    } catch (error) {
      console.error("❌ [DEBUG] Error fetching users:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get("db-test")
  async testDbConnection() {
    try {
      console.log("🔌 [DEBUG] Testing database connection...");

      // Simple query to test connection
      const testUser = await this.userRepository.findByEmail(
        "test@nonexistent.com"
      );

      console.log("✅ [DEBUG] Database connection successful");

      return {
        success: true,
        message: "Database connection working",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ [DEBUG] Database connection failed:", error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
