import { secretsManager } from './secretsManager';

/**
 * Initialize secrets on application startup
 * This script runs before the main application starts
 */
export function initializeSecrets(): boolean {
  console.log('🔐 Initializing application secrets...');
  
  try {
    // Initialize with default values
    secretsManager.initializeWithDefaults();
    
    // Get summary of current secrets status
    const summary = secretsManager.getSecretsSummary();
    console.log(`📊 Secrets Status: ${summary.configured.length}/${summary.total} configured`);
    
    // Validate all secrets
    const validation = secretsManager.validateSecrets();
    
    if (validation.valid) {
      console.log('✅ All required secrets are properly configured');
      
      // Show configured secrets (without values)
      if (summary.configured.length > 0) {
        console.log('📋 Configured secrets:', summary.configured.join(', '));
      }
      
      return true;
    } else {
      console.error('❌ Secret validation failed:');
      validation.errors.forEach(error => console.error(`  • ${error}`));
      
      console.log('\n' + secretsManager.generateSetupInstructions());
      
      return false;
    }
  } catch (error) {
    console.error('💥 Failed to initialize secrets:', error);
    return false;
  }
}

/**
 * Auto-setup secrets for first-time users
 * This creates default values and guides users through setup
 */
export function autoSetupSecrets(): void {
  console.log('🚀 First-time setup detected - configuring default secrets...');
  
  // Check if DATABASE_URL is available from Replit environment
  if (process.env.DATABASE_URL && !secretsManager.hasSecret('DATABASE_URL')) {
    secretsManager.setSecret('DATABASE_URL', process.env.DATABASE_URL);
    console.log('✅ DATABASE_URL automatically configured from Replit environment');
  }
  
  // Set the correct Replit app URL based on current workspace
  let correctReplitUrl = process.env.REPLIT_URL;
  if (!correctReplitUrl && process.env.REPL_OWNER && process.env.REPL_SLUG) {
    // Generate URL from workspace info
    correctReplitUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }
  if (!correctReplitUrl) {
    // Fallback to the original URL if nothing else works
    correctReplitUrl = 'https://627846c6-9a01-430d-ad44-d2681f586ed6-00-3fa36lqk65xc4.pike.replit.dev';
  }
  
  if (!secretsManager.hasSecret('REPLIT_APP_URL')) {
    secretsManager.setSecret('REPLIT_APP_URL', correctReplitUrl);
    console.log('✅ REPLIT_APP_URL configured:', correctReplitUrl);
  }
  
  // Generate a random session secret if none exists
  if (!secretsManager.hasSecret('SESSION_SECRET')) {
    const sessionSecret = require('crypto').randomBytes(64).toString('hex');
    secretsManager.setSecret('SESSION_SECRET', sessionSecret);
    console.log('✅ SESSION_SECRET automatically generated');
  }

  // Set up Remove.bg API keys if provided
  const removeBgKeys = [
    't36zpz3dQAYijdKLnCN9LGp7',
    '16mnhbhR1Ri34KxCnt4ZyCaE',
    'YZ9pEHwR2X2KSd9K3G3m6mqH',
    'p3DEavB9wtFWzjZitGX2nMmd',
    'TPKFjueBjHWs7cNfdWKGwERF',
    'xppsCfXGDrkEyRiA6wEoPEXn',
    'H7E6suyFrz3yMfS7YZi3vEXR',
    'eqEa5sGDx4Bgs8B6RbcxNQZZ',
    'dWLRwNHkSJ37Ra7ytJRssvRn',
    'aThf5xv9VWGYc3HvepvfBrAd'
  ];
  
  removeBgKeys.forEach((key, index) => {
    const secretKey = `REMOVE_BG_API_KEY_${index + 1}`;
    // Always update the keys to ensure they match the provided ones
    secretsManager.setSecret(secretKey, key);
    console.log(`✅ ${secretKey} updated`);
  });
  
  console.log('📝 Optional: Add SMTP email credentials for email verification:');
  console.log('  • GMAIL_USER & GMAIL_APP_PASSWORD: For Gmail SMTP email service');
}