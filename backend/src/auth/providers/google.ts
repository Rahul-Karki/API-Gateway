import { OAuth2Client } from "google-auth-library";


export const verifyGoogleToken = async (token: string) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error("Google login configuration missing: GOOGLE_CLIENT_ID is not set");
  }

  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: clientId,
  });

  return ticket.getPayload();
};