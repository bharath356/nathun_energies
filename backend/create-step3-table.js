const AWS = require('aws-sdk');

// Configure DynamoDB for local development
const dynamodb = new AWS.DynamoDB({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  accessKeyId: 'dummy',
  secretAccessKey: 'dummy'
});

const step3TableDefinition = {
  TableName: 'call-management-backend-dev-client-step3-data',
  BillingMode: 'PAY_PER_REQUEST',
  AttributeDefinitions: [
    { AttributeName: 'clientId', AttributeType: 'S' },
    { AttributeName: 'updatedAt', AttributeType: 'S' },
    { AttributeName: 'createdBy', AttributeType: 'S' }
  ],
  KeySchema: [
    { AttributeName: 'clientId', KeyType: 'HASH' }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'createdBy-updatedAt-index',
      KeySchema: [
        { AttributeName: 'createdBy', KeyType: 'HASH' },
        { AttributeName: 'updatedAt', KeyType: 'RANGE' }
      ],
      Projection: { ProjectionType: 'ALL' }
    }
  ]
};

async function createStep3Table() {
  console.log('Creating Step 3 Client Data DynamoDB table...');
  
  try {
    // Check if table already exists
    await dynamodb.describeTable({ TableName: step3TableDefinition.TableName }).promise();
    console.log(`✓ Table ${step3TableDefinition.TableName} already exists`);
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      // Table doesn't exist, create it
      try {
        await dynamodb.createTable(step3TableDefinition).promise();
        console.log(`✓ Created table ${step3TableDefinition.TableName}`);
        
        // Wait for table to be active
        await dynamodb.waitFor('tableExists', { TableName: step3TableDefinition.TableName }).promise();
        console.log(`✓ Table ${step3TableDefinition.TableName} is now active`);
      } catch (createError) {
        console.error(`✗ Failed to create table ${step3TableDefinition.TableName}:`, createError.message);
      }
    } else {
      console.error(`✗ Error checking table ${step3TableDefinition.TableName}:`, error.message);
    }
  }
  
  console.log('Step 3 table creation process completed!');
}

createStep3Table().catch(console.error);
