import { APIGatewayRequestAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const USER_POOL_ID = process.env.USER_POOL_ID || '';
const CLIENT_ID = process.env.CLIENT_ID || '';

// Create a verifier for Cognito JWT tokens
const verifier = CognitoJwtVerifier.create({
  userPoolId: USER_POOL_ID,
  tokenUse: 'id',
  clientId: CLIENT_ID,
});

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  console.log('Authorizer event:', JSON.stringify(event, null, 2));

  try {
    // Extract token from query string parameters
    const token = event.queryStringParameters?.token;

    if (!token) {
      console.error('No token provided in query string');
      throw new Error('Unauthorized');
    }

    // Verify the Cognito JWT token
    const payload = await verifier.verify(token);
    console.log('Token verified successfully:', {
      sub: payload.sub,
      email: payload.email,
      cognito_username: payload['cognito:username'],
    });

    // Generate policy to allow the request
    const policy: APIGatewayAuthorizerResult = {
      principalId: payload.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn,
          },
        ],
      },
      context: {
        userId: payload.sub,
        email: String(payload.email || ''),
        username: String(payload['cognito:username'] || ''),
      },
    };

    return policy;
  } catch (error) {
    console.error('Authorization failed:', error);
    throw new Error('Unauthorized');
  }
};
