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
    const smtpHost = this.configService.get<string>("SMTP_HOST");
    const smtpPort = this.configService.get<number>("SMTP_PORT");
    const smtpUser = this.configService.get<string>("SMTP_USER");
    const smtpPass = this.configService.get<string>("SMTP_PASS");

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      this.logger.warn(
        "⚠️ SMTP settings are incomplete. Email service will run in CONSOLE LOG FALLBACK mode."
      );
      this.logger.warn(
        `Missing fields: ${[
          !smtpHost && "SMTP_HOST",
          !smtpPort && "SMTP_PORT",
          !smtpUser && "SMTP_USER",
          !smtpPass && "SMTP_PASS",
        ]
          .filter(Boolean)
          .join(", ")}`
      );
      return;
    }

    try {
      // Bypass static TS compiler check for optional dependency using eval('require')
      let nodemailer: any;
      try {
        nodemailer = eval('require')("nodemailer");
      } catch (e) {
        this.logger.warn("nodemailer package is not installed in local environment.");
      }

      if (nodemailer) {
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465, // true for 465, false for other ports
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
        this.logger.log("✅ SMTP transporter created successfully");
      } else {
        this.logger.warn("❌ SMTP transporter disabled due to missing nodemailer package");
      }
    } catch (error) {
      this.logger.error("❌ Failed to create SMTP transporter:", error.message);
      this.transporter = null;
    }
  }

  async sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
    try {
      const fromName = this.configService.get<string>("SMTP_FROM_NAME") || "MovieStream";
      const fromEmail = this.configService.get<string>("SMTP_FROM_EMAIL") || "no-reply@moviestream.com";

      if (!this.transporter) {
        this.logger.warn(`📬 [EmailService Fallback] No SMTP configuration. Displaying email in console:`);
        this.logger.warn(`--------------------------------------------------`);
        this.logger.warn(`TO: ${to}`);
        this.logger.warn(`SUBJECT: ${subject}`);
        this.logger.warn(`HTML CONTENT:`);
        this.logger.warn(htmlContent.replace(/<[^>]*>/g, "").trim().substring(0, 500) + "...");
        this.logger.warn(`--------------------------------------------------`);
        return true; // Return true as we simulated successful logs
      }

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html: htmlContent,
        text: htmlContent.replace(/<[^>]*>/g, "").trim(),
      };

      const info = await this.transporter.sendMail(mailOptions);
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

    this.logger.log(`📧 Preparing password reset email for: ${email}`);
    
    // Always print the reset link to the console for extremely easy local development testing!
    this.logger.warn(`🔑 [DEV ONLY] PASSWORD RESET LINK FOR ${email}:`);
    this.logger.warn(`👉 ${resetLink}`);

    const htmlContent = this.generatePasswordResetHTML(resetLink, email);
    return this.sendEmail(email, "Đặt lại mật khẩu - MovieStream", htmlContent);
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
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #0b0f19;
            color: #f3f4f6;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .wrapper {
            background-color: #0b0f19;
            width: 100%;
            padding: 40px 0;
          }
          .container {
            max-width: 580px;
            margin: 0 auto;
            background: linear-gradient(135deg, #111827, #1f2937);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
            border: 1px solid #374151;
          }
          .header {
            background-color: #dc2626;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            color: #ffffff;
            font-size: 26px;
            font-weight: 800;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #ffffff;
          }
          .description {
            font-size: 15px;
            line-height: 1.6;
            color: #d1d5db;
            margin-bottom: 30px;
          }
          .button-container {
            text-align: center;
            margin-bottom: 30px;
          }
          .button {
            display: inline-block;
            background-color: #dc2626;
            color: #ffffff !important;
            padding: 14px 32px;
            font-size: 15px;
            font-weight: bold;
            text-decoration: none;
            border-radius: 6px;
            transition: background-color 0.2s ease;
            box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.2);
          }
          .button:hover {
            background-color: #b91c1c;
          }
          .backup-link-title {
            font-size: 13px;
            color: #9ca3af;
            margin-bottom: 10px;
          }
          .backup-link {
            font-size: 12px;
            background-color: #111827;
            border: 1px solid #374151;
            padding: 12px;
            border-radius: 6px;
            word-break: break-all;
            color: #38bdf8;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }
          .warning-box {
            background-color: rgba(245, 158, 11, 0.1);
            border-left: 4px solid #f59e0b;
            padding: 16px;
            margin: 30px 0;
            border-radius: 0 6px 6px 0;
          }
          .warning-box p {
            margin: 0;
            font-size: 13.5px;
            color: #f59e0b;
            line-height: 1.5;
          }
          .footer {
            background-color: #111827;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #374151;
          }
          .footer p {
            margin: 0 0 10px 0;
            font-size: 13px;
            color: #9ca3af;
          }
          .footer-small {
            font-size: 11px !important;
            color: #6b7280 !important;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>🎬 MovieStream</h1>
            </div>
            
            <div class="content">
              <p class="greeting">Xin chào,</p>
              <p class="description">
                Chúng tôi nhận được yêu cầu khôi phục mật khẩu từ tài khoản của bạn tại <strong>MovieStream</strong> (${email}). 
                Nếu đúng là bạn đã gửi yêu cầu này, vui lòng click vào nút bên dưới để tiến hành đổi mật khẩu mới.
              </p>
              
              <div class="button-container">
                <a href="${resetLink}" class="button" target="_blank">Đặt Lại Mật Khẩu</a>
              </div>
              
              <div class="warning-box">
                <p>
                  <strong>⚠️ Bảo mật & Thời hạn:</strong><br>
                  - Liên kết này sẽ hết hiệu lực trong vòng <strong>1 giờ</strong> kể từ lúc yêu cầu.<br>
                  - Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email này một cách an toàn. Mật khẩu của bạn sẽ được giữ nguyên.
                </p>
              </div>
              
              <p class="backup-link-title">Nếu nút phía trên không hoạt động, vui lòng sao chép đường dẫn này vào trình duyệt của bạn:</p>
              <div class="backup-link">${resetLink}</div>
            </div>
            
            <div class="footer">
              <p>Trân trọng,<br>Đội ngũ hỗ trợ khách hàng MovieStream</p>
              <p class="footer-small">Đây là email được gửi tự động, vui lòng không trả lời email này.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
