import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import ApiKey from '../models/ApiKey';
import ApiUsage from '../models/ApiUsage';

export interface ApiRequest extends Request {
  apiKey?: {
    _id: string;
    userId: string;
    name: string;
    rateLimit: {
      requests: number;
      window: number;
    };
    permissions: {
      analyze: boolean;
      preprocess: boolean;
      summarize: boolean;
      export: boolean;
    };
  };
}

// Generate API key
export const generateApiKey = (): string => {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `da_${randomBytes}`;
};

// Hash API key for storage
export const hashApiKey = async (key: string): Promise<string> => {
  return bcrypt.hash(key, 10);
};

// Verify API key
export const verifyApiKey = async (
  hashedKey: string,
  plainKey: string
): Promise<boolean> => {
  return bcrypt.compare(plainKey, hashedKey);
};

// API Key authentication middleware
export const apiKeyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        message: 'Please provide an API key in the X-API-Key header',
      });
    }

    // Find API key in database
    const apiKeys = await ApiKey.find({ isActive: true }).lean();
    let matchedKey = null;

    // Try to match the API key (we store hashed keys)
    for (const key of apiKeys) {
      try {
        const isValid = await verifyApiKey(key.key, apiKey);
        if (isValid) {
          matchedKey = key;
          break;
        }
      } catch (error) {
        // Continue checking other keys
        continue;
      }
    }

    if (!matchedKey) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is invalid or has been revoked',
      });
    }



    // Attach API key info to request
    (req as ApiRequest).apiKey = {
      _id: matchedKey._id.toString(),
      userId: matchedKey.userId.toString(),
      name: matchedKey.name,
      rateLimit: matchedKey.rateLimit,
      permissions: matchedKey.permissions,
    };

    // Update last used timestamp
    await ApiKey.updateOne(
      { _id: matchedKey._id },
      {
        $set: { lastUsedAt: new Date() },
        $inc: { usageCount: 1, monthlyUsage: 1 },
      }
    );

    next();
  } catch (error: any) {
    console.error('API key authentication error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred while authenticating your API key',
    });
  }
};

// Permission checker middleware
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiReq = req as ApiRequest;

    if (!apiReq.apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key authentication required',
      });
    }

    if (!apiReq.apiKey.permissions[permission as keyof typeof apiReq.apiKey.permissions]) {
      return res.status(403).json({
        error: 'Permission denied',
        message: `This API key does not have the '${permission}' permission`,
      });
    }

    next();
  };
};

// Usage tracking middleware
export const trackApiUsage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  const apiReq = req as ApiRequest;

  // Override res.json to capture response
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    const responseTime = Date.now() - startTime;

    // Track usage asynchronously (don't block response)
    if (apiReq.apiKey) {
      trackUsageAsync(apiReq, req, res, responseTime, body).catch(
        (error) => console.error('Usage tracking error:', error)
      );
    }

    return originalJson(body);
  };

  next();
};

const trackUsageAsync = async (
  apiReq: ApiRequest,
  req: Request,
  res: Response,
  responseTime: number,
  responseBody: any
) => {
  try {
    const apiKey = apiReq.apiKey!;
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      'unknown';

    await ApiUsage.create({
      apiKeyId: apiKey._id,
      userId: apiKey.userId,
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      ipAddress,
      userAgent: req.headers['user-agent'],
      requestSize: req.headers['content-length']
        ? parseInt(req.headers['content-length'])
        : undefined,
      responseSize: JSON.stringify(responseBody).length,
      error: res.statusCode >= 400 ? responseBody?.error : undefined,
      metadata: {
        query: req.query,
        params: req.params,
      },
    });
  } catch (error) {
    // Don't throw - usage tracking shouldn't break the API
    console.error('Failed to track API usage:', error);
  }
};

