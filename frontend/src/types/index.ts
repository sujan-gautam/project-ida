export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin?: boolean;
}

export interface ColumnAnalysis {
  type: string;
  missing: number;
  missingPercent: string;
  stats: {
    count: number;
    mean: string;
    median: string;
    min: string;
    max: string;
    std: string;
    q1: string;
    q3: string;
    iqr: string;
    outliers: number;
    skewness: string;
  } | null;
  unique: number;
  valueCounts?: [string, number][];
}

export interface Analysis {
  rowCount: number;
  columnCount: number;
  columns: Record<string, ColumnAnalysis>;
  correlations: Correlation[];
  numericColumns: string[];
  categoricalColumns: string[];
  dateColumns: string[];
  infiniteValueStats?: Record<string, { count: number; percentage: string }>;
  hasInfiniteValues?: boolean;
  duplicateStats?: Record<string, any>;
}

export interface Correlation {
  col1: string;
  col2: string;
  correlation: string;
}

export interface ThreadMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Dataset {
  _id: string;
  userId: string;
  name: string;
  fileName: string;
  rawData: any[];
  analysis: Analysis | null;
  preprocessedData: any[] | null;
  preprocessingSteps?: string[];
  threads: ThreadMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  _id: string;
  key: string;
  name: string;
  description?: string;
  userId: string;
  user?: {
    name: string;
    email: string;
  };
  isActive: boolean;
  rateLimit: {
    requests: number;
    window: number;
  };
  quota: {
    total: number | null;
    used: number;
    resetDate: string;
  };
  permissions: {
    analyze: boolean;
    preprocess: boolean;
    summarize: boolean;
    export: boolean;
  };
  lastUsedAt?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  usage?: {
    today: number;
    total: number;
  };
}

export interface ApiUsage {
  _id: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  ipAddress?: string;
  userAgent?: string;
  error?: string;
  timestamp: string;
}

export interface AdminDashboard {
  overview: {
    totalUsers: number;
    totalApiKeys: number;
    activeApiKeys: number;
    totalDatasets: number;
    totalApiCalls: number;
  };
  today: {
    apiCalls: number;
  };
  thisMonth: {
    apiCalls: number;
  };
  growth: {
    users: number;
    apiCalls: number;
  };
  metrics: {
    averageResponseTime: number;
    errorRate: number;
  };
  topEndpoints: Array<{ _id: string; count: number }>;
  recentUsers: Array<User>;
  recentApiKeys: Array<ApiKey>;
}

