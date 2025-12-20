#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const EnvManager = require('./env-manager');

/**
 * Cross-platform local development startup script
 */
class LocalDevStarter {
  constructor() {
    this.envManager = new EnvManager();
    this.processes = [];
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
   * Check if dependencies are installed
   */
  async checkDependencies() {
    this.info('Checking dependencies...');
    
    const checks = [
      { dir: this.projectRoot, name: 'Root' },
      { dir: this.backendDir, name: 'Backend' },
      { dir: this.frontendDir, name: 'Frontend' }
    ];

    for (const check of checks) {
      const nodeModules = path.join(check.dir, 'node_modules');
      if (!fs.existsSync(nodeModules)) {
        this.warn(`${check.name} dependencies not installed. Installing...`);
        await this.runCommand('npm', ['install'], check.dir);
      } else {
        this.success(`${check.name} dependencies are installed`);
      }
    }
  }

  /**
   * Setup environment files
   */
  setupEnvironment() {
    this.info('Setting up environment...');
    return this.envManager.setupEnvironment();
  }

  /**
   * Run a command and return a promise
   */
  runCommand(command, args = [], cwd = this.projectRoot, background = false) {
    return new Promise((resolve, reject) => {
      const cmd = this.isWindows && command === 'npm' ? 'npm.cmd' : command;
      
      this.info(`Running: ${cmd} ${args.join(' ')} in ${cwd}`);
      
      const child = spawn(cmd, args, {
        cwd,
        stdio: background ? 'pipe' : 'inherit',
        shell: this.isWindows
      });

      if (background) {
        this.processes.push(child);
        
        child.stdout.on('data', (data) => {
          process.stdout.write(`[${command}] ${data}`);
        });
        
        child.stderr.on('data', (data) => {
          process.stderr.write(`[${command}] ${data}`);
        });
      }

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
   * Start DynamoDB Local
   */
  async startDynamoDB() {
    this.info('Starting DynamoDB Local...');
    
    // Check if DynamoDB Local is installed
    const dynamoDir = path.join(this.backendDir, '.dynamodb');
    if (!fs.existsSync(dynamoDir)) {
      this.warn('DynamoDB Local not installed. Installing...');
      await this.runCommand('npm', ['run', 'dynamodb:install'], this.backendDir);
    }

    // Start DynamoDB in background
    this.runCommand('npm', ['run', 'dynamodb:start'], this.backendDir, true);
    
    // Wait for DynamoDB to start
    await this.sleep(10000);
    this.success('DynamoDB Local started at http://localhost:8000');
  }

  /**
   * Setup database tables and seed data
   */
  async setupDatabase() {
    this.info('Setting up database tables and seed data...');
    
    try {
      // Create main tables
      await this.runCommand('npm', ['run', 'dynamodb:create-tables'], this.backendDir);
      this.success('Main tables created');

      // Create client tables
      await this.runCommand('npm', ['run', 'client:create-tables'], this.backendDir);
      this.success('Client tables created');

      // Create step tables
      const stepTables = ['create-step1-table.js', 'create-step2-table.js', 'create-step3-table.js', 'create-step4-table.js', 'create-step5-table.js'];
      for (const table of stepTables) {
        await this.runCommand('node', [table], this.backendDir);
      }
      this.success('Step tables created');

      // Seed data
      await this.runCommand('npm', ['run', 'dynamodb:seed'], this.backendDir);
      await this.runCommand('npm', ['run', 'client:seed'], this.backendDir);
      this.success('Database seeded with sample data');

    } catch (error) {
      this.warn('Some database setup steps failed, but continuing...');
      console.log(error.message);
    }
  }

  /**
   * Start backend service
   */
  async startBackend() {
    this.info('Starting backend service...');
    this.runCommand('npm', ['run', 'express:dev'], this.backendDir, true);
    await this.sleep(5000);
    this.success('Backend started at http://localhost:3001');
  }

  /**
   * Start frontend service
   */
  async startFrontend() {
    this.info('Starting frontend service...');
    this.runCommand('npm', ['start'], this.frontendDir, true);
    await this.sleep(5000);
    this.success('Frontend started at http://localhost:3000');
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Setup cleanup handlers
   */
  setupCleanup() {
    const cleanup = () => {
      this.info('Shutting down services...');
      this.processes.forEach(proc => {
        if (!proc.killed) {
          proc.kill();
        }
      });
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
  }

  /**
   * Display startup information
   */
  displayInfo() {
    console.log('\n🎉 Call Management System is running!');
    console.log('=====================================');
    console.log('📊 Services:');
    console.log('  • DynamoDB Local: http://localhost:8000');
    console.log('  • Backend API: http://localhost:3001');
    console.log('  • Frontend: http://localhost:3000');
    console.log('');
    console.log('🔑 Demo Login Credentials:');
    console.log('  • Admin: admin@example.com / password');
    console.log('  • Caller: caller1@example.com / password');
    console.log('');
    console.log('📋 Features Available:');
    console.log('  • Call Management (Users, Phone Numbers, Calls, Follow-ups)');
    console.log('  • Client Workflow Management (5-Step Process)');
    console.log('  • Interactive Workflow Stepper with Sub-steps');
    console.log('  • Document and Form Data Management');
    console.log('');
    console.log('Press Ctrl+C to stop all services');
    console.log('=====================================\n');
  }

  /**
   * Start the complete development environment
   */
  async start() {
    try {
      console.log('🚀 Starting Call Management System...\n');
      
      this.setupCleanup();
      
      // Setup environment
      this.setupEnvironment();
      
      // Check and install dependencies
      await this.checkDependencies();
      
      // Start DynamoDB
      await this.startDynamoDB();
      
      // Setup database
      await this.setupDatabase();
      
      // Start backend
      await this.startBackend();
      
      // Start frontend
      await this.startFrontend();
      
      // Display info
      this.displayInfo();
      
      // Keep the process running
      process.stdin.resume();
      
    } catch (error) {
      this.error(`Failed to start development environment: ${error.message}`);
      process.exit(1);
    }
  }
}

// CLI interface
if (require.main === module) {
  const starter = new LocalDevStarter();
  starter.start();
}

module.exports = LocalDevStarter;
