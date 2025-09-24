export interface CognitoHostedUIConfig {
  signInUrl: string;
  signUpUrl: string;
  signOutUrl: string;
  domain: string;
  clientId: string;
  redirectUri: string;
  logoutUri: string;
  userPoolId: string;
  region: string;
}

export interface CognitoTokens {
  access_token: string;
  id_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface CognitoUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  username?: string;
  'custom:full_name'?: string;
  'cognito:username'?: string;
}

export interface TokenPayload {
  sub: string;
  token_use: 'id' | 'access';
  aud?: string;
  client_id?: string;
  email?: string;
  name?: string;
  username?: string;
  exp: number;
  iat: number;
  iss: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  name: string;
  fullName?: string;
  username?: string;
  tokenType: 'id' | 'access';
  emailVerified?: boolean;
  cognitoUsername?: string;
  cognitoGroups?: string[];
}

export interface AuthSession {
  user: AuthUser;
  tokens: {
    accessToken: string;
    idToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  };
  loginTime: string;
  expiresAt: string;
  onboardingResult?: any;
}

export interface NetworkStatus {
  isHealthy: boolean;
  issueCount: number;
  lastIssue: Date | null;
  message?: string;
  recommendation?: string;
}
