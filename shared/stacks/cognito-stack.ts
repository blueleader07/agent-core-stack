import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CognitoAuth } from '../constructs/cognito-auth';

/**
 * Shared Cognito stack for all Bedrock examples
 * This ensures all examples use the same user pool and users only sign in once
 */
export class CognitoStack extends cdk.Stack {
  public readonly cognitoAuth: CognitoAuth;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create shared Cognito authentication
    this.cognitoAuth = new CognitoAuth(this, 'SharedCognitoAuth', {
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrls: [
        'http://localhost:5173',
        // Add your CloudFront URL here after deployment
      ],
      logoutUrls: [
        'http://localhost:5173',
        // Add your CloudFront URL here after deployment
      ],
    });

    // Stack outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.cognitoAuth.userPool.userPoolId,
      description: 'Shared Cognito User Pool ID',
      exportName: 'SharedUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.cognitoAuth.userPoolClient.userPoolClientId,
      description: 'Shared Cognito User Pool Client ID',
      exportName: 'SharedUserPoolClientId',
    });

    new cdk.CfnOutput(this, 'CognitoDomain', {
      value: this.cognitoAuth.domain.domainName,
      description: 'Shared Cognito Domain',
      exportName: 'SharedCognitoDomain',
    });

    new cdk.CfnOutput(this, 'AuthorizerFunctionArn', {
      value: this.cognitoAuth.authorizerFunction.functionArn,
      description: 'Shared Cognito Authorizer Function ARN',
      exportName: 'SharedAuthorizerFunctionArn',
    });
  }
}
