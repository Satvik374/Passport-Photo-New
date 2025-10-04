import { freeEmailService } from './emailServiceFree';

export class EmailService {
  // Generate a 6-digit verification code
  static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send verification email using free service (console fallback)
  static async sendVerificationEmail(email: string, verificationCode: string): Promise<boolean> {
    return await freeEmailService.sendVerificationEmail(email, verificationCode);
  }

  // Send welcome email using free service (console fallback)
  static async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    return await freeEmailService.sendWelcomeEmail(email, firstName);
  }
}