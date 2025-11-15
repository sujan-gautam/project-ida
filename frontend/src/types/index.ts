export interface User {
  id: string;
  email: string;
  name: string;
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

