import { Request, Response, NextFunction } from 'express';
import ApiKey from '../models/ApiKey';
import ApiUsage from '../models/ApiUsage';

export interface ApiKeyRequest extends Request {
  apiKey?: any;
  apiKeyId?: string;
}

// Rate limiting store (in-memory, consider Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export const authenticateApiKey = async (
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get API key from header
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(401).json({
        error: 'API key required',
        message: 'Please provide a valid API key in the X-API-Key header or Authorization header',
      });
    }

    // Find API key in database
    const keyDoc = await ApiKey.findOne({ key: apiKey, isActive: true });

    if (!keyDoc) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is invalid or has been deactivated',
      });
    }

    // Check quota
    if (keyDoc.quota.total !== null && keyDoc.quota.used >= keyDoc.quota.total) {
      const resetDate = new Date(keyDoc.quota.resetDate);
      if (resetDate > new Date()) {
        return res.status(429).json({
          error: 'Quota exceeded',
          message: `API quota exceeded. Quota resets on ${resetDate.toISOString()}`,
          quota: {
            total: keyDoc.quota.total,
            used: keyDoc.quota.used,
            resetDate: keyDoc.quota.resetDate,
          },
        });
      } else {
        // Reset quota
        keyDoc.quota.used = 0;
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        keyDoc.quota.resetDate = nextMonth;
        await keyDoc.save();
      }
    }

    // Check rate limit
    const rateLimitKey = `${keyDoc._id}:${req.path}`;
    const now = Date.now();
    const windowMs = keyDoc.rateLimit.window * 1000;

    let rateLimitEntry = rateLimitStore.get(rateLimitKey);

    if (!rateLimitEntry || rateLimitEntry.resetTime < now) {
      // New window
      rateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(rateLimitKey, rateLimitEntry);
    } else {
      rateLimitEntry.count++;

      if (rateLimitEntry.count > keyDoc.rateLimit.requests) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many requests. Limit: ${keyDoc.rateLimit.requests} requests per ${keyDoc.rateLimit.window} seconds`,
          rateLimit: {
            limit: keyDoc.rateLimit.requests,
            window: keyDoc.rateLimit.window,
            resetIn: Math.ceil((rateLimitEntry.resetTime - now) / 1000),
          },
        });
      }
    }

    // Attach API key to request
    req.apiKey = keyDoc;
    req.apiKeyId = keyDoc._id.toString();

    next();
  } catch (error: any) {
    console.error('API key authentication error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred while authenticating your API key',
    });
  }
};

// Track API usage
export const trackApiUsage = async (
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Override res.json to capture response
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    const responseTime = Date.now() - startTime;

    // Track usage asynchronously (don't block response)
    trackUsageAsync(req, res, responseTime, body);

    return originalJson(body);
  };

  next();
};

async function trackUsageAsync(
  req: ApiKeyRequest,
  res: Response,
  responseTime: number,
  body: any
) {
  try {
    if (!req.apiKeyId) return;

    const statusCode = res.statusCode;
    const error = statusCode >= 400 ? (body?.error || body?.message || 'Unknown error') : undefined;

    await ApiUsage.create({
      apiKeyId: req.apiKeyId,
      endpoint: req.path,
      method: req.method,
      statusCode,
      responseTime,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      error,
      metadata: {
        datasetId: body?.datasetId,
        fileSize: (req as any).file?.size,
      },
    });

    // Update API key usage
    const ApiKey = (await import('../models/ApiKey')).default;
    await ApiKey.findByIdAndUpdate(req.apiKeyId, {
      $inc: { usageCount: 1, 'quota.used': 1 },
      lastUsedAt: new Date(),
    });
  } catch (error: any) {
    console.error('Error tracking API usage:', error);
    // Don't throw - tracking errors shouldn't affect API response
  }
}

// Check permissions
export const requirePermission = (permission: 'analyze' | 'preprocess' | 'summarize' | 'export') => {
  return (req: ApiKeyRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key authentication required',
      });
    }

    if (!req.apiKey.permissions[permission]) {
      return res.status(403).json({
        error: 'Permission denied',
        message: `This API key does not have permission to ${permission}`,
        requiredPermission: permission,
      });
    }

    next();
  };
};
