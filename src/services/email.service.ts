import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: any = null;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    const gmailUser = this.configService.get<string>("GMAIL_USER");
    const gmailPass = this.configService.get<string>("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPass) {
      this.logger.warn("⚠️ Gmail settings are incomplete. Email service will run in CONSOLE LOG FALLBACK mode.");
      return;
    }

    try {
      let nodemailer: any;
      try {
        nodemailer = eval('require')("nodemailer");
      } catch {
        this.logger.warn("nodemailer package is not installed.");
        return;
      }

      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      this.logger.log("✅ Gmail transporter created successfully");
    } catch (error) {
      this.logger.error("❌ Failed to create Gmail transporter:", error.message);
      this.transporter = null;
    }
  }

  async sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
    try {
      const fromName = this.configService.get<string>("EMAIL_FROM_NAME") || "MovieStream";
      const fromEmail = this.configService.get<string>("GMAIL_USER") || "no-reply@moviestream.com";

      if (!this.transporter) {
        this.logger.warn(`📬 [EmailService Fallback] No Gmail configuration. Displaying email in console:`);
        this.logger.warn(`TO: ${to}`);
        this.logger.warn(`SUBJECT: ${subject}`);
        this.logger.warn(htmlContent.replace(/<[^>]*>/g, "").trim().substring(0, 500) + "...");
        return true;
      }

      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html: htmlContent,
        text: htmlContent.replace(/<[^>]*>/g, "").trim(),
      });

      this.logger.log(`✅ Email sent successfully to ${to}. Message ID: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${to}:`, error.message);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    this.logger.warn(`🔑 [DEV] PASSWORD RESET LINK FOR ${email}: ${resetLink}`);

    return this.sendEmail(email, "Đặt lại mật khẩu - MovieStream", this.generatePasswordResetHTML(resetLink, email));
  }

  private generatePasswordResetHTML(resetLink: string, email: string): string {
    return `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Đặt lại mật khẩu của bạn</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 0; }
          .wrapper { background-color: #0b0f19; width: 100%; padding: 40px 0; }
          .container { max-width: 580px; margin: 0 auto; background: linear-gradient(135deg, #111827, #1f2937); border-radius: 12px; overflow: hidden; border: 1px solid #374151; }
          .header { background-color: #dc2626; padding: 30px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; }
          .content { padding: 40px 30px; }
          .button { display: inline-block; background-color: #dc2626; color: #ffffff !important; padding: 14px 32px; font-size: 15px; font-weight: bold; text-decoration: none; border-radius: 6px; }
          .warning-box { background-color: rgba(245,158,11,0.1); border-left: 4px solid #f59e0b; padding: 16px; margin: 30px 0; border-radius: 0 6px 6px 0; }
          .warning-box p { margin: 0; font-size: 13.5px; color: #f59e0b; }
          .backup-link { font-size: 12px; background-color: #111827; border: 1px solid #374151; padding: 12px; border-radius: 6px; word-break: break-all; color: #38bdf8; font-family: monospace; }
          .footer { background-color: #111827; padding: 24px 30px; text-align: center; border-top: 1px solid #374151; }
          .footer p { margin: 0 0 10px 0; font-size: 13px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header"><h1>🎬 MovieStream</h1></div>
            <div class="content">
              <p style="font-size:18px;font-weight:600;color:#fff">Xin chào,</p>
              <p style="color:#d1d5db">Chúng tôi nhận được yêu cầu khôi phục mật khẩu từ tài khoản <strong>${email}</strong>.</p>
              <div style="text-align:center;margin:30px 0">
                <a href="${resetLink}" class="button">Đặt Lại Mật Khẩu</a>
              </div>
              <div class="warning-box">
                <p><strong>⚠️ Lưu ý:</strong><br>- Link hết hiệu lực sau <strong>1 giờ</strong>.<br>- Nếu bạn không gửi yêu cầu này, hãy bỏ qua email này.</p>
              </div>
              <p style="font-size:13px;color:#9ca3af">Nếu nút không hoạt động, sao chép link sau vào trình duyệt:</p>
              <div class="backup-link">${resetLink}</div>
            </div>
            <div class="footer">
              <p>Trân trọng,<br>Đội ngũ MovieStream</p>
              <p style="font-size:11px;color:#6b7280">Đây là email tự động, vui lòng không trả lời.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
