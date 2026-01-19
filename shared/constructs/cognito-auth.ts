import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export interface CognitoAuthProps {
  /**
   * Google OAuth Client ID
   */
  googleClientId: string;

  /**
   * Google OAuth Client Secret
   */
  googleClientSecret: string;

  /**
   * Callback URLs for OAuth flow
   */
  callbackUrls?: string[];

  /**
   * Logout URLs
   */
  logoutUrls?: string[];
}

export class CognitoAuth extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly authorizerFunction: lambda.Function;
  public readonly domain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props: CognitoAuthProps) {
    super(scope, id);

    // Create Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${id}-user-pool`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: false,
          mutable: true,
        },
        familyName: {
          required: false,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Google Identity Provider
    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleProvider', {
      userPool: this.userPool,
      clientId: props.googleClientId,
      clientSecretValue: cdk.SecretValue.unsafePlainText(props.googleClientSecret),
      scopes: ['profile', 'email', 'openid'],
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
        familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
        profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
      },
    });

    // User Pool Client
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      generateSecret: false, // Must be false for public clients (browser apps)
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true, // Use Authorization Code flow (more secure)
          implicitCodeGrant: false,     // Disable Implicit flow (less secure)
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: props.callbackUrls || ['http://localhost:5173'],
        logoutUrls: props.logoutUrls || ['http://localhost:5173'],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.GOOGLE,
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
      // Enable refresh tokens
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      // Enable token revocation
      enableTokenRevocation: true,
      // Prevent user existence errors (security best practice)
      preventUserExistenceErrors: true,
    });

    // Ensure Google provider is created before the client
    this.userPoolClient.node.addDependency(googleProvider);

    // Cognito Domain for hosted UI
    // Use a unique hash to avoid domain conflicts
    const uniqueHash = require('crypto')
      .createHash('md5')
      .update(`${cdk.Stack.of(this).stackName}-${cdk.Stack.of(this).account}`)
      .digest('hex')
      .substring(0, 8);
    
    this.domain = this.userPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix: `bedrock-agent-${uniqueHash}`,
      },
    });

    // Lambda Authorizer
    this.authorizerFunction = new lambda.Function(this, 'AuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../auth/cognito-authorizer')),
      timeout: cdk.Duration.seconds(10),
      environment: {
        USER_POOL_ID: this.userPool.userPoolId,
        CLIENT_ID: this.userPoolClient.userPoolClientId,
      },
    });

    // Grant API Gateway permission to invoke the authorizer
    // This allows any API Gateway in the account to use this authorizer
    this.authorizerFunction.addPermission('ApiGatewayInvoke', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:*`,
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'CognitoDomain', {
      value: this.domain.domainName,
      description: 'Cognito Hosted UI Domain',
    });

    new cdk.CfnOutput(this, 'HostedUIUrl', {
      value: `https://${this.domain.domainName}.auth.${cdk.Stack.of(this).region}.amazoncognito.com`,
      description: 'Cognito Hosted UI URL',
    });
  }
}
