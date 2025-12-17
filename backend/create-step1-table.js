const AWS = require('aws-sdk');

// Configure DynamoDB for local development
const dynamodb = new AWS.DynamoDB({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  accessKeyId: 'dummy',
  secretAccessKey: 'dummy'
});

const step1TableDefinition = {
  TableName: 'call-management-backend-dev-client-step1-data',
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

async function createStep1Table() {
  console.log('Creating Step 1 Client Data DynamoDB table...');
  
  try {
    // Check if table already exists
    await dynamodb.describeTable({ TableName: step1TableDefinition.TableName }).promise();
    console.log(`✓ Table ${step1TableDefinition.TableName} already exists`);
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      // Table doesn't exist, create it
      try {
        await dynamodb.createTable(step1TableDefinition).promise();
        console.log(`✓ Created table ${step1TableDefinition.TableName}`);
        
        // Wait for table to be active
        await dynamodb.waitFor('tableExists', { TableName: step1TableDefinition.TableName }).promise();
        console.log(`✓ Table ${step1TableDefinition.TableName} is now active`);
      } catch (createError) {
        console.error(`✗ Failed to create table ${step1TableDefinition.TableName}:`, createError.message);
      }
    } else {
      console.error(`✗ Error checking table ${step1TableDefinition.TableName}:`, error.message);
    }
  }
  
  console.log('Step 1 table creation process completed!');
}

createStep1Table().catch(console.error);
