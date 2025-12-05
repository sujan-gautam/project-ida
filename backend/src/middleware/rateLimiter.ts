import { Request, Response, NextFunction } from 'express';
import { ApiRequest } from './apiAuth';
import ApiKey from '../models/ApiKey';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (use Redis in production)
const rateLimitStore: RateLimitStore = {};

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((key) => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 60000);

export const apiRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiReq = req as ApiRequest;

  if (!apiReq.apiKey) {
    return next(); // Let other middleware handle auth errors
  }

  const apiKeyId = apiReq.apiKey._id;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window

  // Get or create rate limit entry
  if (!rateLimitStore[apiKeyId]) {
    rateLimitStore[apiKeyId] = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  const limitData = rateLimitStore[apiKeyId];

  // Reset if window expired
  if (now >= limitData.resetTime) {
    limitData.count = 0;
    limitData.resetTime = now + windowMs;
  }

  // Check rate limit
  const rateLimit = apiReq.apiKey.rateLimit;
  
  if (limitData.count >= rateLimit) {
    const retryAfter = Math.ceil((limitData.resetTime - now) / 1000);
    
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Rate limit of ${rateLimit} requests per minute exceeded. Please try again in ${retryAfter} seconds.`,
      retryAfter,
      limit: rateLimit,
      remaining: 0,
    });
  }

  // Increment counter
  limitData.count++;

  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', rateLimit.toString());
  res.setHeader('X-RateLimit-Remaining', (rateLimit - limitData.count).toString());
  res.setHeader('X-RateLimit-Reset', new Date(limitData.resetTime).toISOString());

  next();
};

// Monthly usage checker
export const checkMonthlyLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiReq = req as ApiRequest;

  if (!apiReq.apiKey) {
    return next();
  }

  try {
    const apiKey = await ApiKey.findById(apiReq.apiKey._id);

    if (!apiKey || !apiKey.isActive) {
      return res.status(401).json({
        error: 'API key invalid',
        message: 'This API key is invalid or has been revoked',
      });
    }

    // Check monthly limit
    if (apiKey.monthlyUsage >= apiKey.monthlyLimit) {
      return res.status(429).json({
        error: 'Monthly limit exceeded',
        message: `Monthly usage limit of ${apiKey.monthlyLimit} requests has been reached. Please upgrade your plan or wait until next month.`,
        monthlyLimit: apiKey.monthlyLimit,
        monthlyUsage: apiKey.monthlyUsage,
      });
    }

    next();
  } catch (error: any) {
    console.error('Monthly limit check error:', error);
    // Continue on error - don't block requests
    next();
  }
};

