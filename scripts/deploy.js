#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Cross-platform deployment script for Call Management System
 */
class Deployer {
  constructor() {
    this.isWindows = process.platform === 'win32';
    this.projectRoot = path.resolve(__dirname, '..');
    this.backendDir = path.join(this.projectRoot, 'backend');
    this.frontendDir = path.join(this.projectRoot, 'frontend');
  }

  /**
   * Log with timestamp and color
   */
  log(message, color = '\x1b[0m') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${color}[${timestamp}] ${message}\x1b[0m`);
  }

  /**
   * Log info message
   */
  info(message) {
    this.log(message, '\x1b[36m'); // Cyan
  }

  /**
   * Log success message
   */
  success(message) {
    this.log(message, '\x1b[32m'); // Green
  }

  /**
   * Log warning message
   */
  warn(message) {
    this.log(message, '\x1b[33m'); // Yellow
  }

  /**
   * Log error message
   */
  error(message) {
    this.log(message, '\x1b[31m'); // Red
  }

  /**
   * Run a command and return a promise
   */
  runCommand(command, args = [], cwd = this.projectRoot) {
    return new Promise((resolve, reject) => {
      const cmd = this.isWindows && command === 'npm' ? 'npm.cmd' : command;
      
      this.info(`Running: ${cmd} ${args.join(' ')} in ${cwd}`);
      
      const child = spawn(cmd, args, {
        cwd,
        stdio: 'inherit',
        shell: this.isWindows
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Check if required files exist
   */
  checkRequiredFiles(target) {
    const requiredFiles = {
      backend: [
        path.join(this.backendDir, 'serverless.yml'),
        path.join(this.backendDir, 'package.json')
      ],
      frontend: [
        path.join(this.frontendDir, 'package.json'),
        path.join(this.frontendDir, 'public', 'index.html')
      ]
    };

    const files = requiredFiles[target] || [];
    const missing = files.filter(file => !fs.existsSync(file));

    if (missing.length > 0) {
      this.error(`Missing required files for ${target}:`);
      missing.forEach(file => this.error(`  - ${file}`));
      return false;
    }

    return true;
  }

  /**
   * Deploy backend using serverless
   */
  async deployBackend(stage = 'dev') {
    this.info('🚀 Deploying backend...');
    
    if (!this.checkRequiredFiles('backend')) {
      throw new Error('Backend deployment failed: missing required files');
    }

    try {
      // Install dependencies if needed
      const nodeModules = path.join(this.backendDir, 'node_modules');
      if (!fs.existsSync(nodeModules)) {
        this.info('Installing backend dependencies...');
        await this.runCommand('npm', ['install'], this.backendDir);
      }

      // Build if needed
      this.info('Building backend...');
      await this.runCommand('npm', ['run', 'build'], this.backendDir);

      // Deploy with serverless
      this.info(`Deploying to ${stage} stage...`);
      await this.runCommand('npx', ['serverless', 'deploy', '--stage', stage], this.backendDir);

      this.success('✅ Backend deployed successfully!');
      
    } catch (error) {
      this.error(`❌ Backend deployment failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deploy frontend (build and prepare for hosting)
   */
  async deployFrontend() {
    this.info('🚀 Deploying frontend...');
    
    if (!this.checkRequiredFiles('frontend')) {
      throw new Error('Frontend deployment failed: missing required files');
    }

    try {
      // Install dependencies if needed
      const nodeModules = path.join(this.frontendDir, 'node_modules');
      if (!fs.existsSync(nodeModules)) {
        this.info('Installing frontend dependencies...');
        await this.runCommand('npm', ['install'], this.frontendDir);
      }

      // Build for production
      this.info('Building frontend for production...');
      await this.runCommand('npm', ['run', 'build'], this.frontendDir);

      const buildDir = path.join(this.frontendDir, 'build');
      if (fs.existsSync(buildDir)) {
        this.success('✅ Frontend built successfully!');
        this.info(`📁 Build output available at: ${buildDir}`);
        this.info('📋 Next steps for frontend deployment:');
        this.info('  1. Upload the build folder contents to your web hosting service');
        this.info('  2. Configure your hosting to serve index.html for all routes (SPA routing)');
        this.info('  3. Update your backend API endpoints in the frontend configuration');
      } else {
        throw new Error('Build directory not found after build');
      }
      
    } catch (error) {
      this.error(`❌ Frontend deployment failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deploy both backend and frontend
   */
  async deployAll(stage = 'dev') {
    this.info('🚀 Deploying entire application...');
    
    try {
      await this.deployBackend(stage);
      await this.deployFrontend();
      
      this.success('🎉 Full application deployment completed!');
      
    } catch (error) {
      this.error(`❌ Full deployment failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Show deployment status and information
   */
  async showInfo(target) {
    this.info(`📊 ${target} deployment information:`);
    
    if (target === 'backend' || target === 'all') {
      try {
        this.info('Backend service information:');
        await this.runCommand('npx', ['serverless', 'info'], this.backendDir);
      } catch (error) {
        this.warn('Could not retrieve backend info (may not be deployed yet)');
      }
    }
    
    if (target === 'frontend' || target === 'all') {
      const buildDir = path.join(this.frontendDir, 'build');
      if (fs.existsSync(buildDir)) {
        this.success('Frontend build is available');
        this.info(`Build location: ${buildDir}`);
      } else {
        this.warn('Frontend not built yet');
      }
    }
  }
}

// CLI interface
if (require.main === module) {
  const deployer = new Deployer();
  const target = process.argv[2] || 'help';
  const stage = process.argv[3] || 'dev';

  async function main() {
    try {
      switch (target) {
        case 'backend':
          await deployer.deployBackend(stage);
          break;
        case 'frontend':
          await deployer.deployFrontend();
          break;
        case 'all':
          await deployer.deployAll(stage);
          break;
        case 'info':
          await deployer.showInfo(process.argv[3] || 'all');
          break;
        case 'help':
        default:
          console.log('Usage:');
          console.log('  node deploy.js backend [stage]  - Deploy backend (default stage: dev)');
          console.log('  node deploy.js frontend         - Build frontend for deployment');
          console.log('  node deploy.js all [stage]      - Deploy both backend and frontend');
          console.log('  node deploy.js info [target]    - Show deployment information');
          console.log('');
          console.log('Examples:');
          console.log('  node deploy.js backend dev      - Deploy backend to dev stage');
          console.log('  node deploy.js backend prod     - Deploy backend to prod stage');
          console.log('  node deploy.js frontend         - Build frontend');
          console.log('  node deploy.js all prod         - Deploy everything to prod');
          break;
      }
    } catch (error) {
      console.error(`Deployment failed: ${error.message}`);
      process.exit(1);
    }
  }

  main();
}

module.exports = Deployer;
