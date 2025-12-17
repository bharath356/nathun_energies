const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure DynamoDB for local development
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  accessKeyId: 'dummy',
  secretAccessKey: 'dummy'
});

// Table names
const TABLES = {
  USERS: 'call-management-backend-dev-users',
  PHONE_NUMBERS: 'call-management-backend-dev-phone-numbers',
  CALLS: 'call-management-backend-dev-calls',
  FOLLOWUPS: 'call-management-backend-dev-followups'
};

// Command line arguments
const args = process.argv.slice(2);
const cleanupOnly = args.includes('--cleanup-only');
const skipCleanup = args.includes('--skip-cleanup');

/**
 * Clean up all items from a specific table
 */
async function cleanupTable(tableName) {
  console.log(`🧹 Cleaning up table: ${tableName}`);
  
  try {
    let itemsDeleted = 0;
    let lastEvaluatedKey = null;
    
    do {
      // Scan the table to get all items
      const scanParams = {
        TableName: tableName,
        ProjectionExpression: Object.keys(getTableKey(tableName)).join(', ')
      };
      
      if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      const scanResult = await dynamodb.scan(scanParams).promise();
      
      if (scanResult.Items && scanResult.Items.length > 0) {
        // Prepare batch delete requests
        const deleteRequests = scanResult.Items.map(item => ({
          DeleteRequest: {
            Key: getTableKey(tableName, item)
          }
        }));
        
        // Process in batches of 25 (DynamoDB limit)
        for (let i = 0; i < deleteRequests.length; i += 25) {
          const batch = deleteRequests.slice(i, i + 25);
          
          const batchParams = {
            RequestItems: {
              [tableName]: batch
            }
          };
          
          await dynamodb.batchWrite(batchParams).promise();
          itemsDeleted += batch.length;
          
          // Show progress
          if (itemsDeleted % 50 === 0) {
            console.log(`   Deleted ${itemsDeleted} items...`);
          }
        }
      }
      
      lastEvaluatedKey = scanResult.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    
    console.log(`✓ Cleaned up ${itemsDeleted} items from ${tableName}`);
    return itemsDeleted;
    
  } catch (error) {
    console.error(`✗ Error cleaning up table ${tableName}:`, error.message);
    throw error;
  }
}

/**
 * Get the primary key structure for a table
 */
function getTableKey(tableName, item = null) {
  switch (tableName) {
    case TABLES.USERS:
      return item ? { userId: item.userId } : { userId: 'userId' };
    case TABLES.PHONE_NUMBERS:
      return item ? { phoneNumber: item.phoneNumber } : { phoneNumber: 'phoneNumber' };
    case TABLES.CALLS:
      return item ? { callId: item.callId } : { callId: 'callId' };
    case TABLES.FOLLOWUPS:
      return item ? { followUpId: item.followUpId } : { followUpId: 'followUpId' };
    default:
      throw new Error(`Unknown table: ${tableName}`);
  }
}

/**
 * Clean up all tables
 */
async function cleanupAllTables() {
  console.log('🧹 Starting cleanup of all tables...\n');
  
  let totalDeleted = 0;
  
  for (const [name, tableName] of Object.entries(TABLES)) {
    try {
      const deleted = await cleanupTable(tableName);
      totalDeleted += deleted;
    } catch (error) {
      console.error(`Failed to cleanup ${name} table:`, error.message);
      throw error;
    }
  }
  
  console.log(`\n✓ Cleanup completed! Total items deleted: ${totalDeleted}\n`);
  return totalDeleted;
}

/**
 * Seed users data
 */
async function seedUsers() {
  const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, 'seeds', 'users.json'), 'utf8'));
  console.log(`👥 Seeding ${usersData.length} users...`);
  
  let seeded = 0;
  
  for (const user of usersData) {
    try {
      await dynamodb.put({
        TableName: TABLES.USERS,
        Item: user
      }).promise();
      
      console.log(`   ✓ Seeded user: ${user.email}`);
      seeded++;
    } catch (error) {
      console.error(`   ✗ Failed to seed user ${user.email}:`, error.message);
      throw error;
    }
  }
  
  console.log(`✓ Successfully seeded ${seeded} users\n`);
  return seeded;
}

/**
 * Seed phone numbers data
 */
async function seedPhoneNumbers() {
  const phoneNumbersPath = path.join(__dirname, 'seeds', 'phone-numbers.json');
  
  if (!fs.existsSync(phoneNumbersPath)) {
    console.log('📞 No phone numbers file found, skipping...\n');
    return 0;
  }
  
  const phoneNumbersData = JSON.parse(fs.readFileSync(phoneNumbersPath, 'utf8'));
  console.log(`📞 Seeding ${phoneNumbersData.length} phone numbers...`);
  
  let seeded = 0;
  
  // Use batch write for better performance
  for (let i = 0; i < phoneNumbersData.length; i += 25) {
    const batch = phoneNumbersData.slice(i, i + 25);
    
    const putRequests = batch.map(phoneNumber => ({
      PutRequest: {
        Item: phoneNumber
      }
    }));
    
    const batchParams = {
      RequestItems: {
        [TABLES.PHONE_NUMBERS]: putRequests
      }
    };
    
    try {
      await dynamodb.batchWrite(batchParams).promise();
      
      batch.forEach(phoneNumber => {
        console.log(`   ✓ Seeded phone number: ${phoneNumber.phoneNumber}`);
      });
      
      seeded += batch.length;
    } catch (error) {
      console.error(`   ✗ Failed to seed phone numbers batch:`, error.message);
      throw error;
    }
  }
  
  console.log(`✓ Successfully seeded ${seeded} phone numbers\n`);
  return seeded;
}

/**
 * Seed calls data
 */
async function seedCalls() {
  const callsPath = path.join(__dirname, 'seeds', 'calls.json');
  
  if (!fs.existsSync(callsPath)) {
    console.log('📞 No calls file found, skipping...\n');
    return 0;
  }
  
  const callsData = JSON.parse(fs.readFileSync(callsPath, 'utf8'));
  console.log(`📞 Seeding ${callsData.length} calls...`);
  
  let seeded = 0;
  
  for (const call of callsData) {
    try {
      await dynamodb.put({
        TableName: TABLES.CALLS,
        Item: call
      }).promise();
      
      console.log(`   ✓ Seeded call: ${call.callId} (${call.status})`);
      seeded++;
    } catch (error) {
      console.error(`   ✗ Failed to seed call ${call.callId}:`, error.message);
      throw error;
    }
  }
  
  console.log(`✓ Successfully seeded ${seeded} calls\n`);
  return seeded;
}

/**
 * Main seeding function
 */
async function seedData() {
  console.log('🌱 Starting data seeding process...\n');
  
  try {
    let totalSeeded = 0;
    
    // Cleanup existing data (unless skipped)
    if (!skipCleanup) {
      await cleanupAllTables();
    } else {
      console.log('⚠️  Skipping cleanup - existing data will remain\n');
    }
    
    // If cleanup-only mode, exit here
    if (cleanupOnly) {
      console.log('✓ Cleanup-only mode completed successfully!');
      return;
    }
    
    // Seed all data
    console.log('🌱 Starting data seeding...\n');
    
    totalSeeded += await seedUsers();
    totalSeeded += await seedPhoneNumbers();
    totalSeeded += await seedCalls();
    
    console.log('🎉 Data seeding completed successfully!');
    console.log(`📊 Total items seeded: ${totalSeeded}`);
    console.log('\n🔐 Demo login credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: password');
    console.log('\n💡 Usage examples:');
    console.log('   node seed-data.js                 # Clean and seed all data');
    console.log('   node seed-data.js --cleanup-only  # Only cleanup, no seeding');
    console.log('   node seed-data.js --skip-cleanup  # Seed without cleanup');
    
  } catch (error) {
    console.error('\n💥 Error during seeding process:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Show usage if help requested
if (args.includes('--help') || args.includes('-h')) {
  console.log('📖 Seed Data Script Usage:');
  console.log('');
  console.log('  node seed-data.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --cleanup-only    Only cleanup existing data, do not seed');
  console.log('  --skip-cleanup    Skip cleanup, only add new data');
  console.log('  --help, -h        Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node seed-data.js                 # Clean and seed all data (default)');
  console.log('  node seed-data.js --cleanup-only  # Only remove existing data');
  console.log('  node seed-data.js --skip-cleanup  # Add data without removing existing');
  process.exit(0);
}

// Run the seeding process
seedData().catch(console.error);
