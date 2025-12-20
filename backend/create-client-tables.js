const AWS = require('aws-sdk');

// Configure DynamoDB for local development
const dynamodb = new AWS.DynamoDB({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  accessKeyId: 'dummy',
  secretAccessKey: 'dummy'
});

const clientTableDefinitions = [
  {
    TableName: 'call-management-backend-dev-clients',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'clientId', AttributeType: 'S' },
      { AttributeName: 'assignedTo', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' },
      { AttributeName: 'createdAt', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'clientId', KeyType: 'HASH' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'assignedTo-createdAt-index',
        KeySchema: [
          { AttributeName: 'assignedTo', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'status-createdAt-index',
        KeySchema: [
          { AttributeName: 'status', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },
  {
    TableName: 'call-management-backend-dev-client-steps',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'stepId', AttributeType: 'S' },
      { AttributeName: 'clientId', AttributeType: 'S' },
      { AttributeName: 'stepNumber', AttributeType: 'N' },
      { AttributeName: 'assignedTo', AttributeType: 'S' },
      { AttributeName: 'dueDate', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'stepId', KeyType: 'HASH' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'clientId-stepNumber-index',
        KeySchema: [
          { AttributeName: 'clientId', KeyType: 'HASH' },
          { AttributeName: 'stepNumber', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'assignedTo-dueDate-index',
        KeySchema: [
          { AttributeName: 'assignedTo', KeyType: 'HASH' },
          { AttributeName: 'dueDate', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },
  {
    TableName: 'call-management-backend-dev-client-substeps',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'subStepId', AttributeType: 'S' },
      { AttributeName: 'stepId', AttributeType: 'S' },
      { AttributeName: 'subStepOrder', AttributeType: 'N' },
      { AttributeName: 'assignedTo', AttributeType: 'S' },
      { AttributeName: 'dueDate', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'subStepId', KeyType: 'HASH' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'stepId-subStepOrder-index',
        KeySchema: [
          { AttributeName: 'stepId', KeyType: 'HASH' },
          { AttributeName: 'subStepOrder', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'assignedTo-dueDate-index',
        KeySchema: [
          { AttributeName: 'assignedTo', KeyType: 'HASH' },
          { AttributeName: 'dueDate', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },
  {
    TableName: 'call-management-backend-dev-client-documents',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'documentId', AttributeType: 'S' },
      { AttributeName: 'clientId', AttributeType: 'S' },
      { AttributeName: 'uploadedAt', AttributeType: 'S' },
      { AttributeName: 'stepId', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'documentId', KeyType: 'HASH' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'clientId-uploadedAt-index',
        KeySchema: [
          { AttributeName: 'clientId', KeyType: 'HASH' },
          { AttributeName: 'uploadedAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'stepId-uploadedAt-index',
        KeySchema: [
          { AttributeName: 'stepId', KeyType: 'HASH' },
          { AttributeName: 'uploadedAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },
  {
    TableName: 'call-management-backend-dev-client-form-data',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'formDataId', AttributeType: 'S' },
      { AttributeName: 'clientId', AttributeType: 'S' },
      { AttributeName: 'updatedAt', AttributeType: 'S' },
      { AttributeName: 'stepId', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'formDataId', KeyType: 'HASH' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'clientId-updatedAt-index',
        KeySchema: [
          { AttributeName: 'clientId', KeyType: 'HASH' },
          { AttributeName: 'updatedAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'stepId-updatedAt-index',
        KeySchema: [
          { AttributeName: 'stepId', KeyType: 'HASH' },
          { AttributeName: 'updatedAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },
  {
    TableName: 'call-management-backend-dev-client-expenses',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'expenseId', AttributeType: 'S' },
      { AttributeName: 'clientId', AttributeType: 'S' },
      { AttributeName: 'createdAt', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'expenseId', KeyType: 'HASH' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'clientId-createdAt-index',
        KeySchema: [
          { AttributeName: 'clientId', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  }
];

async function createClientTables() {
  console.log('Creating Client Management DynamoDB tables...');
  
  for (const tableDefinition of clientTableDefinitions) {
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
  
  console.log('Client Management table creation process completed!');
}

createClientTables().catch(console.error);
