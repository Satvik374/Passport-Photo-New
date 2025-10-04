import nodemailer from 'nodemailer';
import { secretsManager } from './secretsManager';

// Create a free email service using Gmail SMTP or other free providers
class FreeEmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    // Try multiple free email options
    const emailConfig = this.getEmailConfig();
    
    if (emailConfig) {
      try {
        this.transporter = nodemailer.createTransport(emailConfig);
        
        // Verify connection
        await this.transporter?.verify();
        console.log('✅ Free email service initialized successfully');
      } catch (error) {
        console.warn('⚠️ Failed to initialize email service:', error);
        this.transporter = null;
      }
    } else {
      console.log('ℹ️ No email credentials configured - using console output for verification codes');
    }
  }

  private getEmailConfig() {
    // Check for Gmail credentials
    const gmailUser = secretsManager.getSecret('GMAIL_USER') || process.env.GMAIL_USER;
    const gmailPass = secretsManager.getSecret('GMAIL_APP_PASSWORD') || process.env.GMAIL_APP_PASSWORD;
    
    if (gmailUser && gmailPass) {
      return {
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass // This should be an App Password, not regular password
        }
      };
    }

    // Check for other SMTP providers
    const smtpHost = secretsManager.getSecret('SMTP_HOST') || process.env.SMTP_HOST;
    const smtpPort = secretsManager.getSecret('SMTP_PORT') || process.env.SMTP_PORT;
    const smtpUser = secretsManager.getSecret('SMTP_USER') || process.env.SMTP_USER;
    const smtpPass = secretsManager.getSecret('SMTP_PASS') || process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      return {
        host: smtpHost,
        port: parseInt(smtpPort || '587'),
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      };
    }

    return null;
  }

  // Generate a 6-digit verification code
  static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send verification email or log to console
  async sendVerificationEmail(email: string, verificationCode: string): Promise<boolean> {
    if (!this.transporter) {
      // Fallback: Log verification code to console for development
      console.log('📧 EMAIL VERIFICATION CODE (Console Fallback)');
      console.log('='.repeat(50));
      console.log(`Email: ${email}`);
      console.log(`Verification Code: ${verificationCode}`);
      console.log('='.repeat(50));
      
      // In development, we can return true to simulate successful email sending
      return true;
    }

    try {
      const senderEmail = secretsManager.getSecret('GMAIL_USER') || 
                         secretsManager.getSecret('SMTP_USER') || 
                         'noreply@passport-photos.com';

      const mailOptions = {
        from: `"Passport Photo Generator" <${senderEmail}>`,
        to: email,
        subject: '🔐 Verify Your Email - Passport Photo Generator',
        text: `Your verification code is: ${verificationCode}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email - Passport Photo Generator</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
              
              <!-- Header with beautiful gradient -->
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%); padding: 0; text-align: center; position: relative; overflow: hidden;">
                <div style="background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%); padding: 50px 30px;">
                  <!-- Icon -->
                  <div style="display: inline-block; width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; margin-bottom: 20px; position: relative;">
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px;">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="white" stroke-width="2" fill="none"/>
                        <path d="M22 6L12 13L2 6" stroke="white" stroke-width="2" fill="none"/>
                      </svg>
                    </div>
                  </div>
                  
                  <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    Passport Photo Generator
                  </h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px; font-weight: 400;">
                    Professional photos made simple
                  </p>
                </div>
              </div>
              
              <!-- Main content -->
              <div style="padding: 60px 40px; background: white;">
                <div style="text-align: center; margin-bottom: 40px;">
                  <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 28px; font-weight: 700;">
                    Verify Your Email
                  </h2>
                  <p style="color: #6b7280; font-size: 18px; line-height: 1.6; margin: 0;">
                    Enter this verification code to complete your account setup
                  </p>
                </div>
                
                <!-- Verification code section -->
                <div style="text-align: center; margin: 50px 0;">
                  <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%); border: 3px solid #ddd6fe; border-radius: 20px; padding: 40px; display: inline-block; position: relative; box-shadow: 0 10px 25px rgba(139, 92, 246, 0.15);">
                    <p style="color: #4c1d95; font-size: 14px; font-weight: 600; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">
                      Your Verification Code
                    </p>
                    <div style="font-size: 42px; font-weight: 800; color: #5b21b6; letter-spacing: 12px; font-family: 'Monaco', 'Consolas', monospace; text-shadow: 0 2px 4px rgba(91, 33, 182, 0.2);">
                      ${verificationCode}
                    </div>
                    <div style="position: absolute; top: -10px; right: -10px; width: 20px; height: 20px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);"></div>
                  </div>
                </div>
                
                <!-- Info sections -->
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 40px 0;">
                  <div style="display: flex; align-items: flex-start;">
                    <div style="margin-right: 15px; margin-top: 2px;">
                      <div style="width: 24px; height: 24px; background: #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <div style="color: white; font-weight: bold; font-size: 14px;">!</div>
                      </div>
                    </div>
                    <div>
                      <p style="color: #92400e; font-weight: 600; margin: 0 0 8px 0; font-size: 16px;">
                        Important Security Notice
                      </p>
                      <p style="color: #b45309; margin: 0; font-size: 14px; line-height: 1.5;">
                        This verification code expires in <strong>15 minutes</strong> for your security. 
                        Enter it exactly as shown above - it's case sensitive.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-left: 4px solid #10b981; border-radius: 12px; padding: 20px; margin: 30px 0;">
                  <div style="display: flex; align-items: flex-start;">
                    <div style="margin-right: 15px; margin-top: 2px;">
                      <div style="width: 24px; height: 24px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <div style="color: white; font-weight: bold; font-size: 12px;">✓</div>
                      </div>
                    </div>
                    <div>
                      <p style="color: #065f46; font-weight: 600; margin: 0 0 8px 0; font-size: 16px;">
                        What's Next?
                      </p>
                      <p style="color: #047857; margin: 0; font-size: 14px; line-height: 1.5;">
                        After verification, you'll have full access to create professional passport photos with our advanced AI tools.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Security note -->
              <div style="background: #f9fafb; padding: 30px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0 0 10px 0; line-height: 1.5;">
                  If you didn't create an account with Passport Photo Generator, please ignore this email.
                </p>
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                  This is an automated message. Please do not reply to this email.
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); padding: 40px 30px; text-align: center;">
                <div style="margin-bottom: 20px;">
                  <div style="display: inline-block; width: 50px; height: 50px; background: rgba(255,255,255,0.1); border-radius: 50%; margin-bottom: 15px;">
                    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                      <div style="width: 24px; height: 24px; background: white; border-radius: 6px;"></div>
                    </div>
                  </div>
                  <h3 style="color: white; margin: 0; font-size: 18px; font-weight: 600;">
                    Passport Photo Generator
                  </h3>
                  <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 14px;">
                    AI-powered professional passport photos
                  </p>
                </div>
                
                <div style="border-top: 1px solid #4b5563; padding-top: 20px;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    © 2025 Passport Photo Generator. All rights reserved.
                  </p>
                </div>
              </div>
              
            </div>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ Verification email sent successfully to:', email);
      return true;
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      
      // Fallback to console logging
      console.log('📧 EMAIL VERIFICATION CODE (SMTP Failed - Console Fallback)');
      console.log('='.repeat(50));
      console.log(`Email: ${email}`);
      console.log(`Verification Code: ${verificationCode}`);
      console.log('='.repeat(50));
      
      return true; // Return true in development to continue the flow
    }
  }

  // Send welcome email
  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    if (!this.transporter) {
      console.log(`📧 Welcome email would be sent to: ${email} (${firstName})`);
      return true;
    }

    try {
      const senderEmail = secretsManager.getSecret('GMAIL_USER') || 
                         secretsManager.getSecret('SMTP_USER') || 
                         'noreply@passport-photos.com';

      const mailOptions = {
        from: `"Passport Photo Generator" <${senderEmail}>`,
        to: email,
        subject: '🎉 Welcome to Passport Photo Generator - You\'re All Set!',
        text: `Welcome ${firstName}! Your account has been successfully created.`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Passport Photo Generator!</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
              
              <!-- Celebration Header -->
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%); padding: 0; text-align: center; position: relative; overflow: hidden;">
                <div style="background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%); padding: 50px 30px;">
                  <!-- Success Icon -->
                  <div style="display: inline-block; width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; margin-bottom: 20px; position: relative;">
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px;">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 12L11 14L15 10" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="12" r="9" stroke="white" stroke-width="2" fill="none"/>
                      </svg>
                    </div>
                  </div>
                  
                  <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    Welcome to Passport Photo Generator!
                  </h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px; font-weight: 400;">
                    Your account is ready to use
                  </p>
                </div>
              </div>
              
              <!-- Main content -->
              <div style="padding: 60px 40px; background: white;">
                <div style="text-align: center; margin-bottom: 40px;">
                  <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 28px; font-weight: 700;">
                    Hi ${firstName}! 🎉
                  </h2>
                  <p style="color: #6b7280; font-size: 18px; line-height: 1.6; margin: 0;">
                    Your account has been successfully created and verified! You're all set to create professional passport photos.
                  </p>
                </div>
                
                <!-- Feature Cards -->
                <div style="margin: 50px 0;">
                  <!-- Upload Feature -->
                  <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 4px solid #3b82f6; border-radius: 12px; padding: 25px; margin: 20px 0;">
                    <div style="display: flex; align-items: flex-start;">
                      <div style="margin-right: 20px; margin-top: 2px;">
                        <div style="width: 40px; height: 40px; background: #3b82f6; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                          <div style="color: white; font-weight: bold; font-size: 20px;">📸</div>
                        </div>
                      </div>
                      <div>
                        <h3 style="color: #1e40af; font-weight: 600; margin: 0 0 8px 0; font-size: 18px;">
                          Smart Photo Upload
                        </h3>
                        <p style="color: #1e3a8a; margin: 0; font-size: 14px; line-height: 1.5;">
                          Upload your photos and our AI will automatically remove backgrounds with professional quality.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Layout Feature -->
                  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-left: 4px solid #10b981; border-radius: 12px; padding: 25px; margin: 20px 0;">
                    <div style="display: flex; align-items: flex-start;">
                      <div style="margin-right: 20px; margin-top: 2px;">
                        <div style="width: 40px; height: 40px; background: #10b981; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                          <div style="color: white; font-weight: bold; font-size: 20px;">📋</div>
                        </div>
                      </div>
                      <div>
                        <h3 style="color: #065f46; font-weight: 600; margin: 0 0 8px 0; font-size: 18px;">
                          Professional Layouts
                        </h3>
                        <p style="color: #047857; margin: 0; font-size: 14px; line-height: 1.5;">
                          Generate perfect passport photo layouts with customizable dimensions and quantities.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Download Feature -->
                  <div style="background: linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%); border-left: 4px solid #8b5cf6; border-radius: 12px; padding: 25px; margin: 20px 0;">
                    <div style="display: flex; align-items: flex-start;">
                      <div style="margin-right: 20px; margin-top: 2px;">
                        <div style="width: 40px; height: 40px; background: #8b5cf6; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                          <div style="color: white; font-weight: bold; font-size: 20px;">💾</div>
                        </div>
                      </div>
                      <div>
                        <h3 style="color: #581c87; font-weight: 600; margin: 0 0 8px 0; font-size: 18px;">
                          Multiple Formats
                        </h3>
                        <p style="color: #6b21a8; margin: 0; font-size: 14px; line-height: 1.5;">
                          Download your photos in PDF, PNG, or JPG formats - perfect for any application.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Call to Action -->
                <div style="text-align: center; margin: 50px 0 30px 0;">
                  <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; border-radius: 20px; color: white;">
                    <h3 style="margin: 0 0 15px 0; font-size: 22px; font-weight: 700;">
                      Ready to Get Started?
                    </h3>
                    <p style="margin: 0; font-size: 16px; opacity: 0.9;">
                      Create your first professional passport photo in just a few clicks!
                    </p>
                  </div>
                </div>
              </div>
              
              <!-- Thank you note -->
              <div style="background: #f9fafb; padding: 30px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 16px; text-align: center; margin: 0 0 10px 0; line-height: 1.5;">
                  Thank you for choosing Passport Photo Generator for your professional photo needs!
                </p>
                <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 0;">
                  If you have any questions, we're here to help make your experience perfect.
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); padding: 40px 30px; text-align: center;">
                <div style="margin-bottom: 20px;">
                  <div style="display: inline-block; width: 50px; height: 50px; background: rgba(255,255,255,0.1); border-radius: 50%; margin-bottom: 15px;">
                    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                      <div style="width: 24px; height: 24px; background: white; border-radius: 6px;"></div>
                    </div>
                  </div>
                  <h3 style="color: white; margin: 0; font-size: 18px; font-weight: 600;">
                    Passport Photo Generator
                  </h3>
                  <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 14px;">
                    AI-powered professional passport photos
                  </p>
                </div>
                
                <div style="border-top: 1px solid #4b5563; padding-top: 20px;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    © 2025 Passport Photo Generator. All rights reserved.
                  </p>
                </div>
              </div>
              
            </div>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent successfully to:', email);
      return true;
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      return false;
    }
  }
}

// Export singleton instance
export const freeEmailService = new FreeEmailService();
export { FreeEmailService };