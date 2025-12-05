# API Platform Setup - Complete Guide

This document outlines the complete API platform transformation for the Data Analysis application, turning it into a SaaS business with API integration capabilities.

## 📋 Overview

The application now supports:
1. **API Key Management** - External integration with API keys
2. **Admin Panel** - Complete monitoring and management dashboard
3. **API Documentation** - Interactive documentation for developers
4. **Usage Analytics** - Track API usage, performance, and errors
5. **Rate Limiting & Quotas** - Control API access and usage

## 🏗️ Architecture

### Backend Components

#### 1. Models
- **`ApiKey.ts`** - API key management with rate limiting and quotas
- **`ApiUsage.ts`** - API usage tracking and analytics

#### 2. Middleware
- **`apiKeyAuth.ts`** - API key authentication and rate limiting
- Tracks usage automatically for all API requests

#### 3. Routes
- **`/api/v1/*`** - Public API endpoints (API key required)
- **`/api/admin/*`** - Admin panel endpoints (JWT + admin role required)

### Frontend Components

#### 1. Admin Panel Pages
- **`AdminDashboard.tsx`** - Overview with key metrics
- **`AdminApiKeys.tsx`** - API key management
- **`AdminUsers.tsx`** - User management
- **`AdminAnalytics.tsx`** - Usage analytics and monitoring
- **`AdminSettings.tsx`** - Platform settings

#### 2. Public Pages
- **`ApiDocumentation.tsx`** - Interactive API documentation
- **`ApiPricing.tsx`** - Pricing and plans (optional)

## 🔑 API Endpoints

### Public API (v1) - Requires API Key

All endpoints require `X-API-Key` header or `Authorization: Bearer <api-key>`

#### Dataset Management
```
POST   /api/v1/analyze              - Analyze uploaded dataset
GET    /api/v1/datasets             - List all datasets
GET    /api/v1/datasets/:id/analysis - Get analysis results
POST   /api/v1/datasets/:id/preprocess - Preprocess dataset
POST   /api/v1/datasets/:id/summarize - Generate AI summary
GET    /api/v1/usage                - Get usage statistics
GET    /api/v1/health               - Health check
```

#### Response Format
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Admin API - Requires JWT + Admin Role

```
GET    /api/admin/dashboard         - Dashboard statistics
GET    /api/admin/users             - List all users
GET    /api/admin/api-keys          - List all API keys
POST   /api/admin/api-keys          - Create API key
PATCH  /api/admin/api-keys/:id      - Update API key
DELETE /api/admin/api-keys/:id      - Delete API key
GET    /api/admin/usage             - Usage analytics
GET    /api/admin/datasets          - List all datasets
```

## 🔐 API Key Authentication

### Creating API Keys

Only admins can create API keys through the admin panel.

API keys are generated in format: `ida_<64-char-hex-string>`

### Using API Keys

**Header Method (Recommended):**
```bash
curl -X GET https://api.example.com/api/v1/datasets \
  -H "X-API-Key: ida_abc123..."
```

**Authorization Header:**
```bash
curl -X GET https://api.example.com/api/v1/datasets \
  -H "Authorization: Bearer ida_abc123..."
```

### Rate Limiting

- Default: 100 requests per 60 seconds per endpoint
- Configurable per API key
- Returns `429 Too Many Requests` when exceeded

### Quotas

- Monthly quota per API key
- Configurable total requests per month
- Returns `429 Quota Exceeded` when reached
- Auto-resets monthly

## 📊 Usage Tracking

All API calls are automatically tracked with:
- Endpoint called
- Method used
- Status code
- Response time
- IP address
- User agent
- Error messages (if any)
- Metadata (datasetId, file size, etc.)

## 🎛️ Admin Panel Features

### Dashboard
- Total users, API keys, datasets
- API call statistics
- Growth metrics
- Error rates
- Average response times
- Top endpoints
- Recent activity

### API Key Management
- View all API keys
- Create new API keys
- Update rate limits and quotas
- Enable/disable API keys
- View usage per key
- Delete API keys

### User Management
- View all users
- See user statistics
- View user's API keys
- View user's datasets

### Analytics
- Usage trends
- Endpoint popularity
- Error analysis
- Performance metrics
- Hourly/daily/weekly reports

## 📚 API Documentation

The documentation page includes:
- Authentication guide
- Endpoint reference
- Request/response examples
- Code samples (cURL, JavaScript, Python)
- Error codes
- Rate limits
- Interactive API explorer

## 🚀 Setup Instructions

### 1. Backend Setup

The backend routes are already configured. Just ensure the models are imported:

```typescript
// server.ts already includes:
import apiRoutes from './routes/api';
import adminRoutes from './routes/admin';

app.use('/api/v1', apiRoutes);
app.use('/api/admin', adminRoutes);
```

### 2. Create First Admin User

```typescript
// In MongoDB or through admin script:
const user = await User.findOneAndUpdate(
  { email: 'admin@example.com' },
  { isAdmin: true },
  { new: true }
);
```

### 3. Frontend Setup

1. Update routing in `App.tsx` to include admin routes
2. Create admin panel pages
3. Create API documentation page
4. Update API service with new endpoints

## 🔄 Next Steps

1. **Frontend Admin Panel** (In Progress)
   - [ ] Admin Dashboard component
   - [ ] API Key management UI
   - [ ] User management UI
   - [ ] Analytics charts

2. **API Documentation** (In Progress)
   - [ ] Documentation page
   - [ ] Code examples
   - [ ] Interactive explorer

3. **Additional Features**
   - [ ] Webhook support
   - [ ] API versioning
   - [ ] API testing playground
   - [ ] Email notifications
   - [ ] Usage alerts

## 📝 Example API Usage

### Analyze Dataset

```bash
curl -X POST https://api.example.com/api/v1/analyze \
  -H "X-API-Key: ida_abc123..." \
  -F "file=@dataset.csv" \
  -F "name=My Dataset"
```

### Get Analysis Results

```bash
curl -X GET https://api.example.com/api/v1/datasets/DATASET_ID/analysis \
  -H "X-API-Key: ida_abc123..."
```

### Generate Summary

```bash
curl -X POST https://api.example.com/api/v1/datasets/DATASET_ID/summarize \
  -H "X-API-Key: ida_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"mode": "intermediate"}'
```

### Get Usage Statistics

```bash
curl -X GET https://api.example.com/api/v1/usage \
  -H "X-API-Key: ida_abc123..."
```

## 🛡️ Security Considerations

1. **API Keys**
   - Never expose in frontend code
   - Store securely in backend systems
   - Rotate regularly
   - Monitor for unauthorized use

2. **Rate Limiting**
   - Prevents abuse
   - Protects server resources
   - Fair usage enforcement

3. **Quotas**
   - Control costs
   - Plan-based limits
   - Predictable usage

4. **Admin Access**
   - Restricted to admin users
   - Audit logging
   - Role-based access control

## 📈 Monitoring & Alerts

- Real-time usage tracking
- Error rate monitoring
- Performance metrics
- Quota usage alerts
- Suspicious activity detection

## 🎯 Business Model

1. **Free Tier**
   - Limited API calls per month
   - Basic features
   - Community support

2. **Pro Tier**
   - Higher API call limits
   - Advanced features
   - Priority support

3. **Enterprise Tier**
   - Unlimited API calls
   - Custom rate limits
   - Dedicated support
   - SLA guarantees

---

**Status**: Backend API platform complete ✅ | Frontend admin panel in progress 🚧

