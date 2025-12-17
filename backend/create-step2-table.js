const AWS = require('aws-sdk');

// Configure DynamoDB for local development
const dynamodb = new AWS.DynamoDB({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  accessKeyId: 'dummy',
  secretAccessKey: 'dummy'
});

const step2TableDefinition = {
  TableName: 'call-management-backend-dev-client-step2-data',
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

async function createStep2Table() {
  console.log('Creating Step 2 Client Data DynamoDB table...');
  
  try {
    // Check if table already exists
    await dynamodb.describeTable({ TableName: step2TableDefinition.TableName }).promise();
    console.log(`✓ Table ${step2TableDefinition.TableName} already exists`);
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      // Table doesn't exist, create it
      try {
        await dynamodb.createTable(step2TableDefinition).promise();
        console.log(`✓ Created table ${step2TableDefinition.TableName}`);
        
        // Wait for table to be active
        await dynamodb.waitFor('tableExists', { TableName: step2TableDefinition.TableName }).promise();
        console.log(`✓ Table ${step2TableDefinition.TableName} is now active`);
      } catch (createError) {
        console.error(`✗ Failed to create table ${step2TableDefinition.TableName}:`, createError.message);
      }
    } else {
      console.error(`✗ Error checking table ${step2TableDefinition.TableName}:`, error.message);
    }
  }
  
  console.log('Step 2 table creation process completed!');
}

createStep2Table().catch(console.error);
