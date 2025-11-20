import { Request, Response, NextFunction } from "express";

// Middleware to inject mock Whop token for local development
// In production, Whop automatically adds the x-whop-user-token header
export function mockWhopTokenMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only inject mock token in development and if no token is present
  if (process.env.NODE_ENV === "development" && !req.headers["x-whop-user-token"]) {
    // Mock token for local testing
    // You can get a real token from Whop dev tools when testing
    const mockToken = process.env.WHOP_DEV_TOKEN;
    
    if (mockToken) {
      req.headers["x-whop-user-token"] = mockToken;
      console.log("[Dev] Injected mock Whop token");
    }
  }
  
  next();
}
