export interface AuthMethod {
  id: string;
  name: string;
  type: "http" | "oauth2server";
  description: string;
  clientId?: string;
  authorizeUrl?: string;
  requestTokenParams?: { [key: string]: string };
}
