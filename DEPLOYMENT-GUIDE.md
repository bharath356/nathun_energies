# Client Management System - AWS Deployment Guide

This guide provides step-by-step instructions for deploying the complete Client Management System to AWS using manual deployment approach.

## 🏗️ Architecture Overview

**Backend:**
- Single AWS Lambda function (Express.js app)
- Lambda Function URL (no API Gateway needed)
- DynamoDB for data storage (10 tables total)
- S3 for document storage
- JWT authentication

**Frontend:**
- React app deployed to S3
- CloudFront for CDN (optional)
- Calls backend via Lambda Function URL

**Client Workflow System:**
- 5-step client onboarding process
- Document upload and management
- Step-by-step progress tracking
- Multi-user assignment and collaboration

## 📋 Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Node.js 18+** installed
4. **npm** or **yarn** package manager

## 🚀 Backend Deployment

### Step 1: Prepare the Backend

```bash
# Navigate to backend directory
cd call-management-system/backend

# Build and package the application
./build-and-deploy.sh
```

This script will:
- Install dependencies
- Build TypeScript
- Create deployment package (`backend-deployment.zip`)

### Step 2: Create DynamoDB Tables

**Go to AWS Console → DynamoDB → Tables**

Create these **10 tables** for the complete system:

#### Core System Tables

##### Table 1: Users
- **Table name:** `call-management-backend-prod-users`
- **Partition key:** `userId` (String)
- **Billing mode:** On-demand
- **Global Secondary Index:**
  - Index name: `email-index`
  - Partition key: `email` (String)
  - Projected attributes: All attributes

##### Table 2: Phone Numbers
- **Table name:** `call-management-backend-prod-phone-numbers`
- **Partition key:** `phoneNumber` (String)
- **Billing mode:** On-demand
- **Global Secondary Index:**
  - Index name: `assignedTo-index`
  - Partition key: `assignedTo` (String)
  - Projected attributes: All attributes

##### Table 3: Calls
- **Table name:** `call-management-backend-prod-calls`
- **Partition key:** `callId` (String)
- **Billing mode:** On-demand
- **Global Secondary Index:**
  - Index name: `userId-createdAt-index`
  - Partition key: `userId` (String)
  - Sort key: `createdAt` (String)
  - Projected attributes: All attributes

##### Table 4: Follow-ups
- **Table name:** `call-management-backend-prod-followups`
- **Partition key:** `followUpId` (String)
- **Billing mode:** On-demand
- **Global Secondary Index:**
  - Index name: `userId-scheduledDate-index`
  - Partition key: `userId` (String)
  - Sort key: `scheduledDate` (String)
  - Projected attributes: All attributes

#### Client Management Tables

##### Table 5: Clients
- **Table name:** `call-management-backend-prod-clients`
- **Partition key:** `clientId` (String)
- **Billing mode:** On-demand
- **Global Secondary Indexes:**
  - Index name: `assignedTo-createdAt-index`
  - Partition key: `assignedTo` (String)
  - Sort key: `createdAt` (String)
  - Projected attributes: All attributes
  
  - Index name: `status-createdAt-index`
  - Partition key: `status` (String)
  - Sort key: `createdAt` (String)
  - Projected attributes: All attributes

##### Table 6: Client Steps
- **Table name:** `call-management-backend-prod-client-steps`
- **Partition key:** `stepId` (String)
- **Billing mode:** On-demand
- **Global Secondary Indexes:**
  - Index name: `clientId-stepNumber-index`
  - Partition key: `clientId` (String)
  - Sort key: `stepNumber` (Number)
  - Projected attributes: All attributes
  
  - Index name: `assignedTo-dueDate-index`
  - Partition key: `assignedTo` (String)
  - Sort key: `dueDate` (String)
  - Projected attributes: All attributes

##### Table 7: Client Sub-steps
- **Table name:** `call-management-backend-prod-client-substeps`
- **Partition key:** `subStepId` (String)
- **Billing mode:** On-demand
- **Global Secondary Indexes:**
  - Index name: `stepId-subStepOrder-index`
  - Partition key: `stepId` (String)
  - Sort key: `subStepOrder` (Number)
  - Projected attributes: All attributes
  
  - Index name: `assignedTo-dueDate-index`
  - Partition key: `assignedTo` (String)
  - Sort key: `dueDate` (String)
  - Projected attributes: All attributes

##### Table 8: Client Documents
- **Table name:** `call-management-backend-prod-client-documents`
- **Partition key:** `documentId` (String)
- **Billing mode:** On-demand
- **Global Secondary Indexes:**
  - Index name: `clientId-uploadedAt-index`
  - Partition key: `clientId` (String)
  - Sort key: `uploadedAt` (String)
  - Projected attributes: All attributes
  
  - Index name: `stepId-uploadedAt-index`
  - Partition key: `stepId` (String)
  - Sort key: `uploadedAt` (String)
  - Projected attributes: All attributes

##### Table 9: Client Form Data
- **Table name:** `call-management-backend-prod-client-form-data`
- **Partition key:** `formDataId` (String)
- **Billing mode:** On-demand
- **Global Secondary Indexes:**
  - Index name: `clientId-updatedAt-index`
  - Partition key: `clientId` (String)
  - Sort key: `updatedAt` (String)
  - Projected attributes: All attributes
  
  - Index name: `stepId-updatedAt-index`
  - Partition key: `stepId` (String)
  - Sort key: `updatedAt` (String)
  - Projected attributes: All attributes

#### Client Workflow Step Data Tables

##### Table 10: Client Step 1 Data
- **Table name:** `call-management-backend-prod-client-step1-data`
- **Partition key:** `clientId` (String)
- **Billing mode:** On-demand
- **Global Secondary Index:**
  - Index name: `createdBy-updatedAt-index`
  - Partition key: `createdBy` (String)
  - Sort key: `updatedAt` (String)
  - Projected attributes: All attributes

##### Table 11: Client Step 2 Data
- **Table name:** `call-management-backend-prod-client-step2-data`
- **Partition key:** `clientId` (String)
- **Billing mode:** On-demand
- **Global Secondary Index:**
  - Index name: `createdBy-updatedAt-index`
  - Partition key: `createdBy` (String)
  - Sort key: `updatedAt` (String)
  - Projected attributes: All attributes

##### Table 12: Client Step 3 Data
- **Table name:** `call-management-backend-prod-client-step3-data`
- **Partition key:** `clientId` (String)
- **Billing mode:** On-demand
- **Global Secondary Index:**
  - Index name: `createdBy-updatedAt-index`
  - Partition key: `createdBy` (String)
  - Sort key: `updatedAt` (String)
  - Projected attributes: All attributes

##### Table 13: Client Step 4 Data
- **Table name:** `call-management-backend-prod-client-step4-data`
- **Partition key:** `clientId` (String)
- **Billing mode:** On-demand
- **Global Secondary Index:**
  - Index name: `createdBy-updatedAt-index`
  - Partition key: `createdBy` (String)
  - Sort key: `updatedAt` (String)
  - Projected attributes: All attributes

##### Table 14: Client Step 5 Data
- **Table name:** `call-management-backend-prod-client-step5-data`
- **Partition key:** `clientId` (String)
- **Billing mode:** On-demand
- **Global Secondary Index:**
  - Index name: `createdBy-updatedAt-index`
  - Partition key: `createdBy` (String)
  - Sort key: `updatedAt` (String)
  - Projected attributes: All attributes

### Step 3: Create S3 Bucket for Document Storage

**Go to S3 → Buckets → Create bucket**

1. **Bucket name:** `call-management-documents-prod-YOUR-UNIQUE-SUFFIX`
2. **Region:** US East (N. Virginia) us-east-1
3. **Block Public Access:** Keep default settings (Block all public access)
4. **Bucket Versioning:** Enable (recommended for document management)
5. **Default encryption:** Enable with Amazon S3 managed keys (SSE-S3)

#### Configure S3 Bucket Policy

**Go to Permissions → Bucket policy → Edit**

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowLambdaAccess",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::YOUR-ACCOUNT-ID:role/call-management-lambda-role"
            },
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        },
        {
            "Sid": "AllowLambdaListBucket",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::YOUR-ACCOUNT-ID:role/call-management-lambda-role"
            },
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
        }
    ]
}
```

#### Configure CORS for File Uploads

**Go to Permissions → Cross-origin resource sharing (CORS) → Edit**

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "PUT",
            "POST",
            "DELETE",
            "HEAD"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": [
            "ETag"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

### Step 4: Create IAM Role

**Go to IAM → Roles → Create role**

1. **Trusted entity:** AWS service → Lambda
2. **Permissions:** Attach `AWSLambdaBasicExecutionRole`
3. **Custom policy:** Create inline policy with this JSON:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:Query",
                "dynamodb:Scan",
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem"
            ],
            "Resource": [
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-users",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-users/index/*",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-phone-numbers",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-phone-numbers/index/*",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-calls",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-calls/index/*",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-followups",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-followups/index/*",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-clients",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-clients/index/*",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-client-steps",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-client-steps/index/*",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-client-substeps",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-client-substeps/index/*",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-client-documents",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-client-documents/index/*",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-client-form-data",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-client-form-data/index/*",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-client-step1-data",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-client-step1-data/index/*",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-client-step2-data",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-client-step2-data/index/*",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-client-step3-data",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-client-step3-data/index/*",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-client-step4-data",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-client-step4-data/index/*",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-client-step5-data",
                "arn:aws:dynamodb:us-east-1:*:table/call-management-backend-prod-client-step5-data/index/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR-DOCUMENTS-BUCKET-NAME",
                "arn:aws:s3:::YOUR-DOCUMENTS-BUCKET-NAME/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "cognito-idp:AdminCreateUser",
                "cognito-idp:AdminSetUserPassword",
                "cognito-idp:AdminGetUser",
                "cognito-idp:ListUsers"
            ],
            "Resource": "*"
        }
    ]
}
```

4. **Role name:** `call-management-lambda-role`

### Step 5: Create Lambda Function

**Go to AWS Lambda → Functions → Create function**

1. **Function name:** `call-management-backend`
2. **Runtime:** Node.js 18.x
3. **Architecture:** x86_64
4. **Execution role:** Use existing role → `call-management-lambda-role`
5. **Advanced settings:**
   - Memory: 1024 MB
   - Timeout: 300 seconds (5 minutes)

### Step 6: Upload Code

1. In the Lambda function page, go to **Code** tab
2. Click **Upload from** → **.zip file**
3. Upload `backend-deployment.zip`
4. **Handler:** `src/lambda.handler`

### Step 7: Configure Environment Variables

**Go to Configuration → Environment variables**

Add these variables:
- `STAGE`: `prod`
- `REGION`: `us-east-1`
- `USERS_TABLE`: `call-management-backend-prod-users`
- `PHONE_NUMBERS_TABLE`: `call-management-backend-prod-phone-numbers`
- `CALLS_TABLE`: `call-management-backend-prod-calls`
- `FOLLOWUPS_TABLE`: `call-management-backend-prod-followups`
- `CLIENTS_TABLE`: `call-management-backend-prod-clients`
- `CLIENT_STEPS_TABLE`: `call-management-backend-prod-client-steps`
- `CLIENT_SUBSTEPS_TABLE`: `call-management-backend-prod-client-substeps`
- `CLIENT_DOCUMENTS_TABLE`: `call-management-backend-prod-client-documents`
- `CLIENT_FORM_DATA_TABLE`: `call-management-backend-prod-client-form-data`
- `CLIENT_STEP1_TABLE`: `call-management-backend-prod-client-step1-data`
- `CLIENT_STEP2_TABLE`: `call-management-backend-prod-client-step2-data`
- `CLIENT_STEP3_TABLE`: `call-management-backend-prod-client-step3-data`
- `CLIENT_STEP4_TABLE`: `call-management-backend-prod-client-step4-data`
- `CLIENT_STEP5_TABLE`: `call-management-backend-prod-client-step5-data`
- `S3_BUCKET_NAME`: `YOUR-DOCUMENTS-BUCKET-NAME`
- `JWT_SECRET`: `your-super-secure-jwt-secret-key-change-this-to-something-random`
- `COGNITO_USER_POOL_ID`: `` (leave empty if not using Cognito)
- `COGNITO_CLIENT_ID`: `` (leave empty if not using Cognito)

### Step 8: Create Function URL

**Go to Configuration → Function URL**

1. Click **Create function URL**
2. **Auth type:** NONE
3. **Configure cross-origin resource sharing (CORS):** ✓
   - **Allow origin:** `*`
   - **Allow headers:** `content-type,x-amz-date,authorization,x-api-key,x-amz-security-token`
   - **Allow methods:** `GET,POST,PUT,DELETE,OPTIONS`
4. Click **Save**

**📝 Important:** Copy the Function URL - you'll need this for the frontend!

### Step 9: Test the Backend

Test your Lambda function:

```bash
# Health check
curl https://your-function-url.lambda-url.us-east-1.on.aws/health

# Register a user
curl -X POST https://your-function-url.lambda-url.us-east-1.on.aws/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "role": "admin",
    "firstName": "Admin",
    "lastName": "User"
  }'

# Test client workflow endpoints
curl -X GET https://your-function-url.lambda-url.us-east-1.on.aws/clients \
  -H "Authorization: Bearer YOUR-JWT-TOKEN"
```

## 🌐 Frontend Deployment

### Step 1: Update Frontend Configuration

**Edit `call-management-system/frontend/src/services/api.ts`:**

```typescript
// Replace the baseURL with your Lambda Function URL
const API_BASE_URL = 'https://your-function-url.lambda-url.us-east-1.on.aws';
```

### Step 2: Build Frontend

```bash
# Navigate to frontend directory
cd call-management-system/frontend

# Install dependencies
npm install

# Build for production
npm run build
```

### Step 3: Create S3 Bucket for Frontend

**Go to S3 → Buckets → Create bucket**

1. **Bucket name:** `call-management-frontend-prod-YOUR-UNIQUE-SUFFIX`
2. **Region:** US East (N. Virginia) us-east-1
3. **Block Public Access:** UNCHECK "Block all public access"
4. **Acknowledge:** ✓ "I acknowledge that the current settings might result in this bucket and the objects within becoming public"

### Step 4: Configure Static Website Hosting

1. Click on your bucket → **Properties** tab
2. Scroll to **Static website hosting** → **Edit**
3. **Static website hosting:** Enable
4. **Hosting type:** Host a static website
5. **Index document:** `index.html`
6. **Error document:** `index.html`
7. **Save changes**

### Step 5: Set Bucket Policy

**Go to Permissions → Bucket policy → Edit**

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-FRONTEND-BUCKET-NAME/*"
        }
    ]
}
```

### Step 6: Upload Frontend Files

**Method 1: AWS Console**
1. Go to **Objects** tab → **Upload**
2. **Add files** and **Add folder**
3. Select all files from `call-management-system/frontend/build/`
4. **Upload**

**Method 2: AWS CLI (Recommended)**
```bash
# Navigate to build directory
cd call-management-system/frontend/build

# Upload all files
aws s3 sync . s3://YOUR-FRONTEND-BUCKET-NAME --delete

# Set proper content types
aws s3 cp . s3://YOUR-FRONTEND-BUCKET-NAME --recursive --exclude "*" --include "*.html" --content-type "text/html"
aws s3 cp . s3://YOUR-FRONTEND-BUCKET-NAME --recursive --exclude "*" --include "*.css" --content-type "text/css"
aws s3 cp . s3://YOUR-FRONTEND-BUCKET-NAME --recursive --exclude "*" --include "*.js" --content-type "application/javascript"
```

### Step 7: Access Your Application

Your application will be available at:
`http://YOUR-FRONTEND-BUCKET-NAME.s3-website-us-east-1.amazonaws.com`

## 🔧 Optional: CloudFront Setup

For better performance and custom domain:

1. **Go to CloudFront → Create Distribution**
2. **Origin Domain:** Your S3 bucket website endpoint
3. **Default Root Object:** `index.html`
4. **Error Pages:** Add custom error response
   - HTTP Error Code: 403, 404
   - Response Page Path: `/index.html`
   - HTTP Response Code: 200
5. **Create distribution**

## 🧪 Testing Your Complete Deployment

### 1. Basic System Test
1. **Access the frontend URL**
2. **Register a new admin user**
3. **Login with the admin credentials**
4. **Test basic call management features**

### 2. Client Workflow Test
1. **Navigate to Clients page**
2. **Create a new client**
3. **Test Step 1 form (Personal Info, Plant Details, Pricing, etc.)**
4. **Upload documents in Step 1**
5. **Progress through Steps 2-5**
6. **Verify data persistence across steps**

### 3. File Upload Test
1. **Go to any step with file upload capability**
2. **Upload various file types (PDF, images, documents)**
3. **Verify files are stored in S3**
4. **Test file download functionality**

### 4. Multi-user Test
1. **Create multiple users with different roles**
2. **Test client assignment to different users**
3. **Verify step-level permissions and assignments**

## 📊 Monitoring and Logs

- **Lambda Logs:** CloudWatch → Log groups → `/aws/lambda/call-management-backend`
- **S3 Access Logs:** Can be enabled in S3 bucket properties
- **CloudFront Logs:** Can be enabled in CloudFront distribution settings
- **DynamoDB Metrics:** CloudWatch → Metrics → DynamoDB

## 🔒 Security Considerations

1. **Change JWT Secret:** Use a strong, random JWT secret (minimum 32 characters)
2. **HTTPS Only:** Ensure all communication uses HTTPS
3. **CORS Configuration:** Restrict CORS to your domain in production
4. **IAM Permissions:** Follow principle of least privilege
5. **Environment Variables:** Never commit secrets to version control
6. **S3 Bucket Security:** 
   - Enable versioning for document recovery
   - Consider enabling MFA delete for critical documents
   - Set up lifecycle policies for cost optimization
7. **File Upload Security:**
   - Validate file types and sizes
   - Scan uploaded files for malware (consider AWS GuardDuty)
   - Implement file access controls

## 💰 Cost Estimation

**Monthly costs (approximate for moderate usage):**
- Lambda: $5-20 (depending on requests and execution time)
- DynamoDB: $10-50 (on-demand pricing, depends on data volume)
- S3 Storage: $5-25 (depends on document storage volume)
- S3 Requests: $1-5 (file uploads/downloads)
- CloudFront: $5-15 (optional, for better performance)
- Data Transfer: $1-10 (outbound data transfer)

**Total: ~$25-125/month** depending on usage volume

## 🚨 Troubleshooting

### Common Issues:

1. **CORS Errors:**
   - Check Lambda Function URL CORS settings
   - Verify frontend API base URL
   - Ensure S3 bucket CORS configuration

2. **Authentication Errors:**
   - Check JWT secret in environment variables
   - Verify DynamoDB table names and permissions
   - Check user registration and login endpoints

3. **Database Errors:**
   - Ensure all 14 DynamoDB tables exist with correct names
   - Check IAM role permissions for all tables
   - Verify Global Secondary Indexes are created

4. **File Upload Errors:**
   - Check S3 bucket permissions and CORS
   - Verify S3_BUCKET_NAME environment variable
   - Ensure Lambda has S3 permissions in IAM role

5. **Frontend Not Loading:**
   - Verify S3 bucket policy for public read access
   - Check static website hosting configuration
   - Ensure all files uploaded correctly

6. **Client Workflow Issues:**
   - Verify all client workflow tables exist
   - Check step-specific environment variables
   - Test individual step endpoints

### Debug Commands:

```bash
# Check Lambda function logs
aws logs tail /aws/lambda/call-management-backend --follow

# Test API endpoints
curl -v https://your-function-url.lambda-url.us-east-1.on.aws/health

# Check S3 bucket contents
aws s3 ls s3://YOUR-BUCKET-NAME --recursive

# Test DynamoDB table access
aws dynamodb describe-table --table-name call-management-backend-prod-users

# Test file upload endpoint
curl -X POST https://your-function-url.lambda-url.us-east-1.on.aws/clients/CLIENT-ID/step1/documents \
  -H "Authorization: Bearer YOUR-JWT-TOKEN" \
  -F "documents=@test-file.pdf"
```

### Performance Optimization:

1. **Lambda Optimization:**
   - Increase memory if experiencing timeouts
   - Consider provisioned concurrency for consistent performance
   - Monitor cold start times

2. **DynamoDB Optimization:**
   - Monitor read/write capacity usage
   - Consider switching to provisioned capacity for predictable workloads
   - Optimize query patterns using GSIs

3. **S3 Optimization:**
   - Enable Transfer Acceleration for large file uploads
   - Set up lifecycle policies to move old documents to cheaper storage classes
   - Consider using CloudFront for frequently accessed documents

## 🎉 Success!

Your complete Client Management System is now deployed to AWS with:

✅ **Full call management functionality**  
✅ **5-step client workflow system**  
✅ **Document upload and storage**  
✅ **Multi-user collaboration**  
✅ **Secure authentication**  
✅ **Scalable architecture**  

**Next Steps:**
- Set up monitoring and alerts
- Configure backup strategies for DynamoDB and S3
- Implement CI/CD pipeline for automated deployments
- Add custom domain name with SSL certificate
- Set up log aggregation and analysis
- Consider implementing AWS WAF for additional security

---

**Need Help?** Check the troubleshooting section or review the AWS documentation for Lambda, DynamoDB, and S3.

**System Features Available:**
- User management and authentication
- Phone number assignment and management
- Call logging and tracking
- Follow-up scheduling
- Complete 5-step client onboarding workflow
- Document management and file uploads
- Multi-user collaboration and assignments
- Progress tracking and reporting
