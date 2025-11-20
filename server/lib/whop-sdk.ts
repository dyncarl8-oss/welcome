import { WhopServerSdk } from "@whop/api";

if (!process.env.WHOP_API_KEY) {
  throw new Error("WHOP_API_KEY environment variable is not set");
}

if (!process.env.NEXT_PUBLIC_WHOP_APP_ID) {
  throw new Error("NEXT_PUBLIC_WHOP_APP_ID environment variable is not set");
}

export const whopSdk = WhopServerSdk({
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID,
  appApiKey: process.env.WHOP_API_KEY,
});
