import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (singleton pattern)
let firebaseInitialized = false;

function initializeFirebase() {
  if (!firebaseInitialized) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });

    firebaseInitialized = true;
    console.log('Firebase Admin initialized');
  }
}

/**
 * WebSocket Lambda Authorizer
 * Validates Firebase ID tokens for WebSocket connections
 */
export const handler = async (event: any) => {
  console.log('Authorizer invoked:', JSON.stringify(event, null, 2));

  const token = event.queryStringParameters?.token;
  const methodArn = event.methodArn;

  if (!token) {
    console.error('No token provided');
    throw new Error('Unauthorized');
  }

  try {
    // Initialize Firebase Admin (only once per cold start)
    initializeFirebase();

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    console.log('Token verified for user:', decodedToken.uid);

    // Return IAM policy allowing the connection
    return {
      principalId: decodedToken.uid,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: methodArn,
          },
        ],
      },
      context: {
        // User context available in WebSocket Lambda
        userId: decodedToken.uid,
        email: decodedToken.email || '',
        name: decodedToken.name || '',
        emailVerified: String(decodedToken.email_verified || false),
      },
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    
    // Return Deny policy
    throw new Error('Unauthorized');
  }
};
