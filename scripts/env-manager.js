#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Cross-platform environment manager for Call Management System
 */
class EnvManager {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.backendDir = path.join(this.projectRoot, 'backend');
    this.frontendDir = path.join(this.projectRoot, 'frontend');
  }

  /**
   * Copy .env.example to .env if .env doesn't exist
   */
  ensureEnvFile(directory, name = '') {
    const envExample = path.join(directory, '.env.example');
    const envFile = path.join(directory, '.env');
    
    if (!fs.existsSync(envFile) && fs.existsSync(envExample)) {
      console.log(`📝 Creating ${name}.env file from .env.example...`);
      fs.copyFileSync(envExample, envFile);
      console.log(`✅ ${name}.env file created successfully`);
      return true;
    } else if (fs.existsSync(envFile)) {
      console.log(`✅ ${name}.env file already exists`);
      return true;
    } else {
      console.log(`⚠️  No .env.example found in ${name || directory}`);
      return false;
    }
  }

  /**
   * Load environment variables from .env file
   */
  loadEnvFile(envPath) {
    if (!fs.existsSync(envPath)) {
      return {};
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        envVars[key.trim()] = value;
      }
    });

    return envVars;
  }

  /**
   * Set environment variables for current process
   */
  setEnvVars(envVars) {
    Object.entries(envVars).forEach(([key, value]) => {
      process.env[key] = value;
    });
  }

  /**
   * Setup environment files for the entire project
   */
  setupEnvironment() {
    console.log('🔧 Setting up environment files...\n');
    
    let success = true;
    
    // Setup backend .env
    if (!this.ensureEnvFile(this.backendDir, 'Backend ')) {
      success = false;
    }
    
    // Setup frontend .env
    if (!this.ensureEnvFile(this.frontendDir, 'Frontend ')) {
      success = false;
    }
    
    if (success) {
      console.log('\n✅ Environment setup completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Review and update backend/.env with your configuration');
      console.log('2. Review and update frontend/.env with your configuration');
      console.log('3. Run "npm run start:local" to start the development environment');
    } else {
      console.log('\n⚠️  Environment setup completed with warnings');
      console.log('Please check the messages above and ensure .env.example files exist');
    }
    
    return success;
  }

  /**
   * Validate required environment variables
   */
  validateEnv(directory, requiredVars = []) {
    const envFile = path.join(directory, '.env');
    const envVars = this.loadEnvFile(envFile);
    
    const missing = requiredVars.filter(varName => !envVars[varName]);
    
    if (missing.length > 0) {
      console.log(`⚠️  Missing required environment variables in ${directory}:`);
      missing.forEach(varName => console.log(`   - ${varName}`));
      return false;
    }
    
    return true;
  }
}

// CLI interface
if (require.main === module) {
  const envManager = new EnvManager();
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
      envManager.setupEnvironment();
      break;
    case 'validate':
      const directory = process.argv[3] || envManager.backendDir;
      const isValid = envManager.validateEnv(directory);
      process.exit(isValid ? 0 : 1);
      break;
    default:
      console.log('Usage:');
      console.log('  node env-manager.js setup     - Setup .env files from .env.example');
      console.log('  node env-manager.js validate  - Validate environment variables');
      break;
  }
}

module.exports = EnvManager;
