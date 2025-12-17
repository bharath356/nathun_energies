const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure DynamoDB for local development
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  accessKeyId: 'dummy',
  secretAccessKey: 'dummy'
});

const CLIENT_STEP_TEMPLATES = [
  {
    stepNumber: 1,
    stepName: 'Client Finalization & Loan Process',
    estimatedDays: 7,
  },
  {
    stepNumber: 2,
    stepName: 'Site Survey and Installation',
    estimatedDays: 5,
  },
  {
    stepNumber: 3,
    stepName: 'Dispatch Process',
    estimatedDays: 10,
  },
  {
    stepNumber: 4,
    stepName: 'Ghar Portal Upload',
    estimatedDays: 3,
  },
  {
    stepNumber: 5,
    stepName: 'Final Bank Process and Subsidy',
    estimatedDays: 7,
  }
];

async function seedClientData() {
  console.log('Seeding client management data...');

  try {
    // First, get existing users to assign clients to
    const usersResult = await dynamodb.scan({
      TableName: 'call-management-backend-dev-users'
    }).promise();
    
    const users = usersResult.Items || [];
    if (users.length === 0) {
      console.log('No users found. Please seed user data first.');
      return;
    }

    // Sample clients data
    const sampleClients = [
      {
        name: 'Rajesh Kumar',
        mobile: '+91-9876543210',
        address: '123 MG Road, Bangalore, Karnataka 560001',
        status: 'active',
        currentStep: 1
      },
      {
        name: 'Priya Sharma',
        mobile: '+91-9876543211',
        address: '456 Park Street, Mumbai, Maharashtra 400001',
        status: 'active',
        currentStep: 2
      },
      {
        name: 'Amit Patel',
        mobile: '+91-9876543212',
        address: '789 Civil Lines, Delhi, Delhi 110001',
        status: 'active',
        currentStep: 1
      },
      {
        name: 'Sunita Reddy',
        mobile: '+91-9876543213',
        address: '321 Anna Nagar, Chennai, Tamil Nadu 600001',
        status: 'active',
        currentStep: 3
      },
      {
        name: 'Vikram Singh',
        mobile: '+91-9876543214',
        address: '654 Sector 17, Chandigarh, Punjab 160017',
        status: 'completed',
        currentStep: 5
      }
    ];

    // Create clients and their steps
    for (let i = 0; i < sampleClients.length; i++) {
      const clientData = sampleClients[i];
      const assignedUser = users[i % users.length]; // Distribute clients among users
      
      const now = new Date().toISOString();
      const clientId = uuidv4();
      
      const client = {
        clientId,
        name: clientData.name,
        mobile: clientData.mobile,
        address: clientData.address,
        status: clientData.status,
        currentStep: clientData.currentStep,
        assignedTo: assignedUser.userId,
        createdAt: now,
        updatedAt: now,
      };

      // Create client
      await dynamodb.put({
        TableName: 'call-management-backend-dev-clients',
        Item: client
      }).promise();

      console.log(`✓ Created client: ${client.name}`);

      // Create steps for this client
      for (const template of CLIENT_STEP_TEMPLATES) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + template.estimatedDays);
        
        // Determine step status based on current step
        let stepStatus = 'pending';
        if (template.stepNumber < clientData.currentStep) {
          stepStatus = 'completed';
        } else if (template.stepNumber === clientData.currentStep) {
          stepStatus = 'in-progress';
        }
        
        const step = {
          stepId: uuidv4(),
          clientId: client.clientId,
          stepNumber: template.stepNumber,
          stepName: template.stepName,
          status: stepStatus,
          assignedTo: assignedUser.userId,
          dueDate: dueDate.toISOString().split('T')[0], // YYYY-MM-DD format
          createdAt: now,
          updatedAt: now,
        };

        // Add completedAt for completed steps
        if (stepStatus === 'completed') {
          step.completedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(); // Random completion within last 7 days
        }

        await dynamodb.put({
          TableName: 'call-management-backend-dev-client-steps',
          Item: step
        }).promise();

        // Create sub-steps for step 3 (Dispatch Process)
        if (template.stepNumber === 3) {
          const subSteps = [
            { name: 'Dispatch File to DISCOM', order: 1, estimatedDays: 2 },
            { name: 'File Received from DISCOM', order: 2, estimatedDays: 8 }
          ];

          for (const subStepTemplate of subSteps) {
            const subStepDueDate = new Date();
            subStepDueDate.setDate(subStepDueDate.getDate() + subStepTemplate.estimatedDays);
            
            let subStepStatus = 'pending';
            if (stepStatus === 'completed') {
              subStepStatus = 'completed';
            } else if (stepStatus === 'in-progress' && subStepTemplate.order === 1) {
              subStepStatus = 'in-progress';
            }

            const subStep = {
              subStepId: uuidv4(),
              stepId: step.stepId,
              subStepName: subStepTemplate.name,
              subStepOrder: subStepTemplate.order,
              status: subStepStatus,
              assignedTo: assignedUser.userId,
              dueDate: subStepDueDate.toISOString().split('T')[0],
              createdAt: now,
              updatedAt: now,
            };

            if (subStepStatus === 'completed') {
              subStep.completedAt = new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString();
            }

            await dynamodb.put({
              TableName: 'call-management-backend-dev-client-substeps',
              Item: subStep
            }).promise();
          }
        }
      }

      // Create some sample form data
      const sampleFormFields = [
        { fieldName: 'callFinalizationComments', fieldValue: 'Client is interested in 5KW solar system', fieldType: 'textarea' },
        { fieldName: 'pricingKW', fieldValue: '5', fieldType: 'number' },
        { fieldName: 'nameTransferRequired', fieldValue: 'true', fieldType: 'boolean' },
        { fieldName: 'paymentMode', fieldValue: 'Loan', fieldType: 'select' }
      ];

      for (const field of sampleFormFields) {
        const formData = {
          formDataId: uuidv4(),
          clientId: client.clientId,
          fieldName: field.fieldName,
          fieldValue: field.fieldValue,
          fieldType: field.fieldType,
          createdAt: now,
          updatedAt: now,
        };

        await dynamodb.put({
          TableName: 'call-management-backend-dev-client-form-data',
          Item: formData
        }).promise();
      }

      // Create some sample documents
      const sampleDocuments = [
        { documentType: 'Aadhaar Card', fileName: 'aadhaar_' + client.name.replace(/\s+/g, '_').toLowerCase() + '.pdf' },
        { documentType: 'PAN Card', fileName: 'pan_' + client.name.replace(/\s+/g, '_').toLowerCase() + '.pdf' },
        { documentType: 'Bank Passbook', fileName: 'bank_' + client.name.replace(/\s+/g, '_').toLowerCase() + '.pdf' }
      ];

      for (const doc of sampleDocuments) {
        const document = {
          documentId: uuidv4(),
          clientId: client.clientId,
          documentType: doc.documentType,
          fileName: doc.fileName,
          fileUrl: `/uploads/clients/${client.clientId}/${doc.fileName}`, // Mock file URL
          fileSize: Math.floor(Math.random() * 1000000) + 100000, // Random file size between 100KB and 1MB
          mimeType: 'application/pdf',
          uploadedBy: assignedUser.userId,
          uploadedAt: now,
          createdAt: now,
          updatedAt: now,
        };

        await dynamodb.put({
          TableName: 'call-management-backend-dev-client-documents',
          Item: document
        }).promise();
      }
    }

    console.log('✓ Client management data seeded successfully!');
    console.log(`Created ${sampleClients.length} clients with their steps, sub-steps, form data, and documents.`);

  } catch (error) {
    console.error('Error seeding client data:', error);
    throw error;
  }
}

// Run the seeding function
seedClientData().catch(console.error);
