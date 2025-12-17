# Call Management System

A comprehensive call management application built with AWS serverless architecture, React, and TypeScript.

## Overview

The Call Management System is designed to help organizations manage outbound calling campaigns efficiently. It provides features for user management, phone number assignment, call tracking, and follow-up management.

## Features

### User Management
- Role-based access control (Admin and Caller roles)
- Secure authentication and authorization
- User profile management

### Phone Number Management
- Random assignment of phone numbers to callers
- Batch allocation (10 numbers per caller at a time)
- Number pool management and availability tracking

### Call Tracking
- Status tracking for each call attempt
- Call history and outcome recording
- Notes and duration tracking

### Follow-up Management
- Scheduled follow-ups for interested contacts
- Follow-up task management and completion tracking
- Configurable reminder system

### Dashboard Interface
- Role-specific dashboard views
- Data visualization and metrics
- Intuitive user interface with responsive design

## Technology Stack

### Frontend
- React with TypeScript
- Material UI for components
- React Router for navigation
- Axios for API communication

### Backend
- AWS Lambda functions (Node.js with TypeScript)
- Amazon API Gateway
- Amazon DynamoDB for data storage
- AWS Cognito for authentication (optional)
- Serverless Framework for deployment

### Development Tools
- TypeScript for type safety
- Jest for testing
- Serverless Offline for local development
- DynamoDB Local for local database

## Architecture

The application follows a serverless architecture pattern:

1. **Frontend**: Static website hosted on S3 and served through CloudFront
2. **API Layer**: RESTful API built with AWS Lambda and API Gateway
3. **Database**: DynamoDB tables for users, phone numbers, calls, and follow-ups
4. **Authentication**: JWT-based authentication with optional AWS Cognito integration

## Quick Start

### Prerequisites
- Node.js (version 14 or later)
- npm (comes with Node.js)
- Java (version 8 or later) - for DynamoDB Local

### Setup and Development
1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd call-management-system
   chmod +x *.sh
   ./setup-new-environment.sh
   ```

2. **Start development environment**:
   ```bash
   ./start-local-dev.sh
   ```

3. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Demo credentials: admin@example.com / password

### Deployment

**Deploy Backend to AWS Lambda**:
```bash
npm run deploy:backend
# or
./deploy-backend.sh
```

**Deploy Frontend to AWS Amplify**:
```bash
npm run deploy:frontend
# or
./deploy-frontend.sh
```

For detailed setup instructions, see [QUICK-START.md](./QUICK-START.md).
For deployment details, see [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md).

## Project Structure

```
call-management-system/
├── README.md                 # This file
├── QUICK-START.md           # Detailed setup guide
├── DEPLOYMENT-GUIDE.md      # Deployment instructions
├── package.json             # Root dependencies and scripts
├── start-local-dev.sh       # Start all services locally
├── setup-new-environment.sh # Initial setup script
├── deploy-backend.sh        # Backend deployment script
├── deploy-frontend.sh       # Frontend deployment script
│
├── frontend/                # React TypeScript app
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── context/         # React context providers
│   │   └── shared/          # Shared types
│   ├── public/              # Static assets
│   ├── package.json         # Frontend dependencies
│   └── .env.example         # Environment template
│
├── backend/                 # Serverless Lambda functions
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic services
│   │   ├── middleware/      # Express middleware
│   │   └── utils/           # Utility functions
│   ├── seeds/               # Sample data
│   ├── resources/           # AWS resources config
│   ├── package.json         # Backend dependencies
│   ├── serverless.yml       # Serverless config
│   └── .env.example         # Environment template
│
└── shared/                  # Shared TypeScript types
    └── types.ts
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
