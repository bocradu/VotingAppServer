const config = {
  redirectUrl: `${process.env.REALM}/auth/openid/return`,
  identityMetadata: `https://login.microsoftonline.com/${
    process.env.AZURE_ACTIVE_DIRECTORY_TENANT_ID
  }/v2.0/.well-known/openid-configuration`,
  clientID: process.env.AZURE_ACTIVE_DIRECTORY_CLIENT_ID,
  clientSecret: process.env.AZURE_ACTIVE_DIRECTORY_SECRET_KEY,
  skipUserProfile: false,
  responseType: "code",
  responseMode: "form_post",
  allowHttpForRedirectUrl: process.env.USE_HTTP === "true",
  loggingLevel: "error",
  scope: ["offline_access", "User.Read", "profile", "email"],
  clientLocation: `${process.env.APP_REALM}/admin`
};

module.exports = {
  // needs to be set to mongo when deployed on azure
  mongoServer: process.env.mongoServer || "mongo",
  mongoPort: process.env.mongoPort || "27017",
  config
};
