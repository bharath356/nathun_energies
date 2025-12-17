import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from './app';

const PORT = process.env.PORT || 3001;

// Log environment variables for debugging (excluding sensitive ones)
console.log('Environment variables loaded:');
console.log('- STAGE:', process.env.STAGE);
console.log('- REGION:', process.env.REGION);
console.log('- IS_OFFLINE:', process.env.IS_OFFLINE);
console.log('- USERS_TABLE:', process.env.USERS_TABLE);
console.log('- PHONE_NUMBERS_TABLE:', process.env.PHONE_NUMBERS_TABLE);
console.log('- CALLS_TABLE:', process.env.CALLS_TABLE);
console.log('- FOLLOWUPS_TABLE:', process.env.FOLLOWUPS_TABLE);
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '[SET]' : '[NOT SET]');

// Start the Express server for local development
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints:`);
  console.log(`   POST http://localhost:${PORT}/auth/register`);
  console.log(`   POST http://localhost:${PORT}/auth/login`);
  console.log(`👥 User endpoints:`);
  console.log(`   GET http://localhost:${PORT}/users`);
  console.log(`   GET http://localhost:${PORT}/users/:id`);
  console.log(`   PUT http://localhost:${PORT}/users/:id`);
  console.log(`📞 Phone number endpoints:`);
  console.log(`   GET http://localhost:${PORT}/phone-numbers`);
  console.log(`   POST http://localhost:${PORT}/phone-numbers`);
  console.log(`   POST http://localhost:${PORT}/phone-numbers/assign`);
  console.log(`   POST http://localhost:${PORT}/phone-numbers/bulk`);
  console.log(`📱 Call endpoints:`);
  console.log(`   GET http://localhost:${PORT}/calls`);
  console.log(`   POST http://localhost:${PORT}/calls`);
  console.log(`   PUT http://localhost:${PORT}/calls/:id`);
  console.log(`   DELETE http://localhost:${PORT}/calls/:id`);
  console.log(`   GET http://localhost:${PORT}/calls/stats`);
  console.log(`📅 Follow-up endpoints:`);
  console.log(`   GET http://localhost:${PORT}/follow-ups`);
  console.log(`   POST http://localhost:${PORT}/follow-ups`);
  console.log(`   PUT http://localhost:${PORT}/follow-ups/:id`);
});
