const AWS = require('aws-sdk');

// Configure DynamoDB for local development
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  accessKeyId: 'dummy',
  secretAccessKey: 'dummy'
});


const PHONE_NUMBERS_TABLE = process.env.PHONE_NUMBERS_TABLE || 'call-management-backend-dev-phone-numbers';
const UNASSIGNED_VALUE = 'UNASSIGNED';

async function scanAllItems(params) {
  const allItems = [];
  let lastEvaluatedKey;

  do {
    const scanParams = {
      ...params,
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
    };

    const result = await dynamodb.scan(scanParams).promise();
    
    if (result.Items) {
      allItems.push(...result.Items);
    }
    
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return allItems;
}

async function fixEmptyAssignedToValues() {
  console.log('🔍 Starting migration to fix empty assignedTo values...');
  console.log(`📋 Table: ${PHONE_NUMBERS_TABLE}`);
  console.log(`🎯 Target: Replace empty strings with '${UNASSIGNED_VALUE}'`);
  console.log('');

  try {
    // Step 1: Find all records with empty assignedTo
    console.log('📊 Step 1: Scanning for records with empty assignedTo values...');
    
    const emptyAssignedToRecords = await scanAllItems({
      TableName: PHONE_NUMBERS_TABLE,
      FilterExpression: 'assignedTo = :empty',
      ExpressionAttributeValues: {
        ':empty': ''
      }
    });

    console.log(`📈 Found ${emptyAssignedToRecords.length} records with empty assignedTo values`);

    if (emptyAssignedToRecords.length === 0) {
      console.log('✅ No records need to be updated. Migration complete!');
      return;
    }

    // Step 2: Show sample of records to be updated
    console.log('\n📋 Sample records to be updated:');
    const sampleRecords = emptyAssignedToRecords.slice(0, 5);
    sampleRecords.forEach((record, index) => {
      console.log(`  ${index + 1}. Phone: ${record.phoneNumber}, Status: ${record.status}, AssignedTo: "${record.assignedTo}"`);
    });
    if (emptyAssignedToRecords.length > 5) {
      console.log(`  ... and ${emptyAssignedToRecords.length - 5} more records`);
    }

    // Step 3: Update records in batches
    console.log('\n🔄 Step 2: Updating records...');
    const BATCH_SIZE = 25; // DynamoDB batch write limit
    const totalBatches = Math.ceil(emptyAssignedToRecords.length / BATCH_SIZE);
    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchNumber = batchIndex + 1;
      const startIdx = batchIndex * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, emptyAssignedToRecords.length);
      const batch = emptyAssignedToRecords.slice(startIdx, endIdx);

      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)...`);

      // Process each record in the batch individually for better error handling
      for (const record of batch) {
        try {
          await dynamodb.update({
            TableName: PHONE_NUMBERS_TABLE,
            Key: { phoneNumber: record.phoneNumber },
            UpdateExpression: 'SET assignedTo = :unassigned, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':unassigned': UNASSIGNED_VALUE,
              ':updatedAt': new Date().toISOString()
            },
            // Add condition to ensure we only update records that still have empty assignedTo
            ConditionExpression: 'assignedTo = :empty',
            ExpressionAttributeValues: {
              ':unassigned': UNASSIGNED_VALUE,
              ':updatedAt': new Date().toISOString(),
              ':empty': ''
            }
          }).promise();

          updatedCount++;
        } catch (error) {
          errorCount++;
          const errorInfo = {
            phoneNumber: record.phoneNumber,
            error: error.message,
            code: error.code
          };
          errors.push(errorInfo);
          console.error(`❌ Error updating ${record.phoneNumber}: ${error.message}`);
        }
      }

      // Progress update
      const progress = Math.round((batchNumber / totalBatches) * 100);
      console.log(`✅ Batch ${batchNumber} completed. Progress: ${progress}%`);
    }

    // Step 4: Verification
    console.log('\n🔍 Step 3: Verifying updates...');
    
    const remainingEmptyRecords = await scanAllItems({
      TableName: PHONE_NUMBERS_TABLE,
      FilterExpression: 'assignedTo = :empty',
      ExpressionAttributeValues: {
        ':empty': ''
      }
    });

    const updatedRecords = await scanAllItems({
      TableName: PHONE_NUMBERS_TABLE,
      FilterExpression: 'assignedTo = :unassigned',
      ExpressionAttributeValues: {
        ':unassigned': UNASSIGNED_VALUE
      }
    });

    // Final report
    console.log('\n📊 Migration Summary:');
    console.log('═'.repeat(50));
    console.log(`📈 Total records found with empty assignedTo: ${emptyAssignedToRecords.length}`);
    console.log(`✅ Successfully updated: ${updatedCount}`);
    console.log(`❌ Errors encountered: ${errorCount}`);
    console.log(`🔍 Records still with empty assignedTo: ${remainingEmptyRecords.length}`);
    console.log(`🎯 Records now with '${UNASSIGNED_VALUE}': ${updatedRecords.length}`);
    console.log('═'.repeat(50));

    if (errorCount > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.phoneNumber}: ${error.error} (${error.code})`);
      });
    }

    if (remainingEmptyRecords.length === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('✅ All empty assignedTo values have been replaced with "UNASSIGNED"');
      console.log('✅ The bulk phone number insert should now work without errors');
    } else {
      console.log('\n⚠️  Migration completed with some remaining issues');
      console.log(`⚠️  ${remainingEmptyRecords.length} records still have empty assignedTo values`);
      console.log('⚠️  You may need to investigate and fix these manually');
    }

  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Rollback function (in case we need to revert)
async function rollbackChanges() {
  console.log('🔄 Rolling back changes...');
  console.log(`🎯 Target: Replace '${UNASSIGNED_VALUE}' with empty strings`);
  
  try {
    const unassignedRecords = await scanAllItems({
      TableName: PHONE_NUMBERS_TABLE,
      FilterExpression: 'assignedTo = :unassigned',
      ExpressionAttributeValues: {
        ':unassigned': UNASSIGNED_VALUE
      }
    });

    console.log(`📈 Found ${unassignedRecords.length} records to rollback`);

    let rolledBackCount = 0;
    for (const record of unassignedRecords) {
      try {
        await dynamodb.update({
          TableName: PHONE_NUMBERS_TABLE,
          Key: { phoneNumber: record.phoneNumber },
          UpdateExpression: 'SET assignedTo = :empty, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':empty': '',
            ':updatedAt': new Date().toISOString()
          }
        }).promise();
        rolledBackCount++;
      } catch (error) {
        console.error(`❌ Error rolling back ${record.phoneNumber}: ${error.message}`);
      }
    }

    console.log(`✅ Rollback completed. ${rolledBackCount} records reverted.`);
  } catch (error) {
    console.error('💥 Error during rollback:', error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--rollback')) {
    await rollbackChanges();
  } else if (args.includes('--help')) {
    console.log('Usage:');
    console.log('  node fix-empty-assignedTo.js          # Run the migration');
    console.log('  node fix-empty-assignedTo.js --rollback # Rollback the changes');
    console.log('  node fix-empty-assignedTo.js --help     # Show this help');
  } else {
    await fixEmptyAssignedToValues();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Migration interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch(console.error);
