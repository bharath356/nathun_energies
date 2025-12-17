import { APIGatewayProxyResult } from 'aws-lambda';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export const createResponse = (
  statusCode: number,
  body: ApiResponse,
  headers: Record<string, string> = {}
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...headers,
    },
    body: JSON.stringify(body),
  };
};

export const successResponse = (data: any, message?: string): APIGatewayProxyResult => {
  return createResponse(200, {
    success: true,
    data,
    message,
  });
};

export const errorResponse = (
  statusCode: number,
  error: string,
  message?: string
): APIGatewayProxyResult => {
  return createResponse(statusCode, {
    success: false,
    error,
    message,
  });
};

export const validationErrorResponse = (error: string): APIGatewayProxyResult => {
  return errorResponse(400, error, 'Validation failed');
};

export const unauthorizedResponse = (error: string = 'Unauthorized'): APIGatewayProxyResult => {
  return errorResponse(401, error);
};

export const forbiddenResponse = (error: string = 'Forbidden'): APIGatewayProxyResult => {
  return errorResponse(403, error);
};

export const notFoundResponse = (error: string = 'Not found'): APIGatewayProxyResult => {
  return errorResponse(404, error);
};

export const internalServerErrorResponse = (error: string = 'Internal server error'): APIGatewayProxyResult => {
  return errorResponse(500, error);
};
