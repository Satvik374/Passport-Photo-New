import fs from 'fs';
import path from 'path';

// Define the secrets configuration
export interface SecretConfig {
  key: string;
  description: string;
  required: boolean;
  defaultValue?: string;
  isUrl?: boolean;
}

// All required secrets for the application
export const REQUIRED_SECRETS: SecretConfig[] = [
  {
    key: 'DATABASE_URL',
    description: 'PostgreSQL database connection URL',
    required: true,
    isUrl: true
  },
  {
    key: 'REMOVE_BG_API_KEY_1',
    description: 'Remove.bg API key #1 for background removal',
    required: false
  },
  {
    key: 'REMOVE_BG_API_KEY_2',
    description: 'Remove.bg API key #2 for background removal',
    required: false
  },
  {
    key: 'REMOVE_BG_API_KEY_3',
    description: 'Remove.bg API key #3 for background removal',
    required: false
  },
  {
    key: 'REMOVE_BG_API_KEY_4',
    description: 'Remove.bg API key #4 for background removal',
    required: false
  },
  {
    key: 'REMOVE_BG_API_KEY_5',
    description: 'Remove.bg API key #5 for background removal',
    required: false
  },
  {
    key: 'REMOVE_BG_API_KEY_6',
    description: 'Remove.bg API key #6 for background removal',
    required: false
  },
  {
    key: 'REMOVE_BG_API_KEY_7',
    description: 'Remove.bg API key #7 for background removal',
    required: false
  },
  {
    key: 'REMOVE_BG_API_KEY_8',
    description: 'Remove.bg API key #8 for background removal',
    required: false
  },
  {
    key: 'REMOVE_BG_API_KEY_9',
    description: 'Remove.bg API key #9 for background removal',
    required: false
  },
  {
    key: 'REMOVE_BG_API_KEY_10',
    description: 'Remove.bg API key #10 for background removal',
    required: false
  },
  {
    key: 'SESSION_SECRET',
    description: 'Secret key for session encryption',
    required: true,
    defaultValue: 'dev-session-secret-change-in-production'
  },
  {
    key: 'GOOGLE_CLIENT_ID',
    description: 'Google OAuth client ID for authentication',
    required: false
  },
  {
    key: 'GOOGLE_CLIENT_SECRET',
    description: 'Google OAuth client secret for authentication',
    required: false
  },
  {
    key: 'REPLIT_APP_URL',
    description: 'The Replit app URL for OAuth redirects',
    required: false
  },

  {
    key: 'GMAIL_USER',
    description: 'Gmail address for sending verification emails',
    required: false
  },
  {
    key: 'GMAIL_APP_PASSWORD',
    description: 'Gmail app password for SMTP authentication',
    required: false
  },
  {
    key: 'SMTP_HOST',
    description: 'SMTP server hostname for email sending',
    required: false
  },
  {
    key: 'SMTP_PORT',
    description: 'SMTP server port (usually 587 or 465)',
    required: false
  },
  {
    key: 'SMTP_USER',
    description: 'SMTP username for authentication',
    required: false
  },
  {
    key: 'SMTP_PASS',
    description: 'SMTP password for authentication',
    required: false
  }
];

export class SecretsManager {
  private secretsFilePath: string;
  private secrets: Map<string, string> = new Map();

  constructor() {
    this.secretsFilePath = path.join(process.cwd(), '.secrets');
    this.loadSecrets();
  }

  /**
   * Load secrets from the .secrets file and environment variables
   */
  private loadSecrets(): void {
    // First, load from environment variables (these take priority)
    REQUIRED_SECRETS.forEach(config => {
      const envValue = process.env[config.key];
      if (envValue && envValue.trim() !== '') {
        this.secrets.set(config.key, envValue.trim());
      }
    });

    // Force check for Google OAuth credentials from Replit Secrets
    if (process.env.GOOGLE_CLIENT_ID) {
      this.secrets.set('GOOGLE_CLIENT_ID', process.env.GOOGLE_CLIENT_ID.trim());
    }
    if (process.env.GOOGLE_CLIENT_SECRET) {
      this.secrets.set('GOOGLE_CLIENT_SECRET', process.env.GOOGLE_CLIENT_SECRET.trim());
    }

    // Also check for common Replit environment variables
    const replitEnvMappings = [
      { env: 'DATABASE_URL', secret: 'DATABASE_URL' },
      { env: 'REPL_SLUG', secret: 'REPL_SLUG' },
      { env: 'REPL_OWNER', secret: 'REPL_OWNER' }
    ];

    replitEnvMappings.forEach(({ env, secret }) => {
      const value = process.env[env];
      if (value && value.trim() !== '' && !this.secrets.has(secret)) {
        this.secrets.set(secret, value.trim());
      }
    });

    // Then, load from .secrets file if it exists
    if (fs.existsSync(this.secretsFilePath)) {
      try {
        const fileContent = fs.readFileSync(this.secretsFilePath, 'utf-8');
        const lines = fileContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        
        lines.forEach(line => {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            // Only use file value if not already set from environment
            if (!this.secrets.has(key.trim())) {
              this.secrets.set(key.trim(), value);
            }
          }
        });
      } catch (error) {
        console.warn('Failed to read .secrets file:', error);
      }
    }
  }

  /**
   * Save secrets to the .secrets file
   */
  private saveSecrets(): void {
    try {
      const content = [
        '# Auto-generated secrets file',
        '# This file contains sensitive information - never commit to version control',
        '# Format: KEY=value',
        '',
        ...Array.from(this.secrets.entries()).map(([key, value]) => `${key}=${value}`)
      ].join('\n');
      
      fs.writeFileSync(this.secretsFilePath, content, 'utf-8');
      
      // Ensure .secrets is in .gitignore
      this.ensureGitIgnore();
    } catch (error) {
      console.error('Failed to save .secrets file:', error);
    }
  }

  /**
   * Ensure .secrets file is in .gitignore
   */
  private ensureGitIgnore(): void {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    const secretsEntry = '.secrets';
    
    try {
      let gitignoreContent = '';
      if (fs.existsSync(gitignorePath)) {
        gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
      }
      
      if (!gitignoreContent.includes(secretsEntry)) {
        gitignoreContent += gitignoreContent.endsWith('\n') ? '' : '\n';
        gitignoreContent += `${secretsEntry}\n`;
        fs.writeFileSync(gitignorePath, gitignoreContent, 'utf-8');
      }
    } catch (error) {
      console.warn('Failed to update .gitignore:', error);
    }
  }

  /**
   * Set a secret value
   */
  setSecret(key: string, value: string): void {
    this.secrets.set(key, value);
    this.saveSecrets();
    
    // Also set in current process environment
    process.env[key] = value;
  }

  /**
   * Get a secret value
   */
  getSecret(key: string): string | undefined {
    return this.secrets.get(key);
  }

  /**
   * Check if a secret exists and has a value
   */
  hasSecret(key: string): boolean {
    const value = this.secrets.get(key);
    return value !== undefined && value !== '';
  }

  /**
   * Get all missing required secrets
   */
  getMissingRequiredSecrets(): SecretConfig[] {
    return REQUIRED_SECRETS.filter(config => {
      if (!config.required) return false;
      
      const hasValue = this.hasSecret(config.key);
      const hasDefault = config.defaultValue !== undefined;
      
      return !hasValue && !hasDefault;
    });
  }

  /**
   * Initialize secrets with default values where applicable
   */
  initializeWithDefaults(): void {
    let updated = false;
    
    REQUIRED_SECRETS.forEach(config => {
      if (config.defaultValue && !this.hasSecret(config.key)) {
        this.secrets.set(config.key, config.defaultValue);
        process.env[config.key] = config.defaultValue;
        updated = true;
        console.log(`✓ Set default value for ${config.key}`);
      }
    });
    
    if (updated) {
      this.saveSecrets();
    }
  }

  /**
   * Validate all secrets and provide helpful error messages
   */
  validateSecrets(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    REQUIRED_SECRETS.forEach(config => {
      if (config.required && !this.hasSecret(config.key) && !config.defaultValue) {
        errors.push(`Missing required secret: ${config.key} - ${config.description}`);
      }
      
      // Validate URL format if specified
      if (config.isUrl && this.hasSecret(config.key)) {
        const value = this.getSecret(config.key)!;
        try {
          new URL(value);
        } catch {
          errors.push(`Invalid URL format for ${config.key}: ${value}`);
        }
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get a summary of all configured secrets (without values)
   */
  getSecretsSummary(): { configured: string[]; missing: string[]; total: number } {
    const configured: string[] = [];
    const missing: string[] = [];
    
    REQUIRED_SECRETS.forEach(config => {
      if (this.hasSecret(config.key) || config.defaultValue) {
        configured.push(config.key);
      } else {
        missing.push(config.key);
      }
    });
    
    return {
      configured,
      missing,
      total: REQUIRED_SECRETS.length
    };
  }

  /**
   * Generate environment setup instructions
   */
  generateSetupInstructions(): string {
    const missing = this.getMissingRequiredSecrets();
    
    if (missing.length === 0) {
      return '✅ All required secrets are configured!';
    }
    
    const instructions = [
      '⚠️  Missing Required Secrets:',
      '',
      ...missing.map(config => `• ${config.key}: ${config.description}`),
      '',
      'To set these secrets:',
      '1. Go to the Secrets tab in your Replit environment',
      '2. Add each required secret with its value',
      '3. Restart your application',
      '',
      'Or create a .secrets file in your project root with:',
      ...missing.map(config => `${config.key}=your_value_here`),
    ];
    
    return instructions.join('\n');
  }
}

// Global instance
export const secretsManager = new SecretsManager();