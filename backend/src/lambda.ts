import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file if in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

import serverless from 'serverless-http';
import app from './app';

// Create serverless handler from Express app
export const handler = serverless(app, {
  binary: ['application/octet-stream', 'image/*'],
});
