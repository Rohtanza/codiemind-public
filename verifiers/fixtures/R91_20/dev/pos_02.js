import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
} from "amazon-cognito-identity-js";

const pool = new CognitoUserPool({
  UserPoolId: "us-east-1_Ab12Cd34E",
  ClientId: "4abc123def456ghi789jkl0mn",
});

export function authenticate(username, password) {
  const user = new CognitoUser({ Username: username, Pool: pool });
  const details = new AuthenticationDetails({ Username: username, Password: password });
  return new Promise((resolve, reject) => {
    user.authenticateUser(details, {
      onSuccess: (session) => resolve(session.getIdToken().getJwtToken()),
      onFailure: reject,
    });
  });
}
