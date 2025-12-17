const AWS = require('aws-sdk');

// Configure DynamoDB for local development
const dynamodb = new AWS.DynamoDB({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  accessKeyId: 'dummy',
  secretAccessKey: 'dummy'
});

const tableDefinitions = [
  {
    TableName: 'call-management-backend-dev-users',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'email-index',
        KeySchema: [
          { AttributeName: 'email', KeyType: 'HASH' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },
  {
    TableName: 'call-management-backend-dev-phone-numbers',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'phoneNumber', AttributeType: 'S' },
      { AttributeName: 'assignedTo', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'phoneNumber', KeyType: 'HASH' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'assignedTo-index',
        KeySchema: [
          { AttributeName: 'assignedTo', KeyType: 'HASH' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },
  {
    TableName: 'call-management-backend-dev-calls',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'callId', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'createdAt', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'callId', KeyType: 'HASH' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'userId-createdAt-index',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },
  {
    TableName: 'call-management-backend-dev-followups',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'followUpId', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'scheduledDate', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'followUpId', KeyType: 'HASH' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'userId-scheduledDate-index',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' },
          { AttributeName: 'scheduledDate', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  }
];

async function createTables() {
  console.log('Creating DynamoDB tables...');
  
  for (const tableDefinition of tableDefinitions) {
    try {
      // Check if table already exists
      await dynamodb.describeTable({ TableName: tableDefinition.TableName }).promise();
      console.log(`✓ Table ${tableDefinition.TableName} already exists`);
    } catch (error) {
      if (error.code === 'ResourceNotFoundException') {
        // Table doesn't exist, create it
        try {
          await dynamodb.createTable(tableDefinition).promise();
          console.log(`✓ Created table ${tableDefinition.TableName}`);
          
          // Wait for table to be active
          await dynamodb.waitFor('tableExists', { TableName: tableDefinition.TableName }).promise();
          console.log(`✓ Table ${tableDefinition.TableName} is now active`);
        } catch (createError) {
          console.error(`✗ Failed to create table ${tableDefinition.TableName}:`, createError.message);
        }
      } else {
        console.error(`✗ Error checking table ${tableDefinition.TableName}:`, error.message);
      }
    }
  }
  
  console.log('Table creation process completed!');
}

createTables().catch(console.error);
