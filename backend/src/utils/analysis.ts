import _ from 'lodash';

export interface ColumnAnalysis {
  type: string;
  missing: number;
  missingPercent: string;
  stats: any;
  unique: number;
  valueCounts?: [string, number][];
}

export interface AnalysisResult {
  rowCount: number;
  columnCount: number;
  columns: Record<string, ColumnAnalysis>;
  correlations: Correlation[];
  numericColumns: string[];
  categoricalColumns: string[];
  dateColumns: string[];
}

export interface Correlation {
  col1: string;
  col2: string;
  correlation: string;
}

export const detectColumnType = (values: any[]): string => {
  const nonNull = values.filter(
    (v) => v !== null && v !== undefined && v !== ''
  );
  if (nonNull.length === 0) return 'empty';

  const numericValues = nonNull.filter(
    (v) => !isNaN(v) && v !== '' && isFinite(v)
  );
  if (numericValues.length / nonNull.length > 0.8) return 'numeric';

  const datePattern = /^\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/;
  const dateValues = nonNull.filter((v) => datePattern.test(String(v)));
  if (dateValues.length / nonNull.length > 0.7) return 'datetime';

  const uniqueRatio = new Set(nonNull).size / nonNull.length;
  if (uniqueRatio < 0.5) return 'categorical';

  return 'text';
};

export const calculateStats = (values: any[]) => {
  const numeric = values
    .filter((v) => !isNaN(v) && v !== null && v !== '' && isFinite(v))
    .map(Number);
  if (numeric.length === 0) return null;

  const sorted = numeric.sort((a, b) => a - b);
  const sum = numeric.reduce((a, b) => a + b, 0);
  const mean = sum / numeric.length;
  const variance =
    numeric.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    numeric.length;
  const std = Math.sqrt(variance);

  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;

  const outliers = numeric.filter(
    (v) => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr
  );

  const skewness =
    numeric.reduce((acc, val) => acc + Math.pow((val - mean) / std, 3), 0) /
    numeric.length;

  return {
    count: numeric.length,
    mean: mean.toFixed(2),
    median: sorted[Math.floor(sorted.length / 2)].toFixed(2),
    min: sorted[0].toFixed(2),
    max: sorted[sorted.length - 1].toFixed(2),
    std: std.toFixed(2),
    q1: q1.toFixed(2),
    q3: q3.toFixed(2),
    iqr: iqr.toFixed(2),
    outliers: outliers.length,
    skewness: skewness.toFixed(2),
  };
};

export const calculatePearsonCorrelation = (pairs: number[][]): number => {
  const n = pairs.length;
  const sum1 = pairs.reduce((s, [x]) => s + x, 0);
  const sum2 = pairs.reduce((s, [, y]) => s + y, 0);
  const sum1Sq = pairs.reduce((s, [x]) => s + x * x, 0);
  const sum2Sq = pairs.reduce((s, [, y]) => s + y * y, 0);
  const pSum = pairs.reduce((s, [x, y]) => s + x * y, 0);

  const num = pSum - (sum1 * sum2) / n;
  const den = Math.sqrt(
    (sum1Sq - (sum1 * sum1) / n) * (sum2Sq - (sum2 * sum2) / n)
  );

  return den === 0 ? 0 : num / den;
};

export const calculateCorrelations = (
  data: any[],
  numericCols: string[]
): Correlation[] => {
  if (numericCols.length < 2) return [];

  const correlations: Correlation[] = [];
  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const col1 = numericCols[i];
      const col2 = numericCols[j];

      const pairs = data
        .map((row) => [parseFloat(row[col1]), parseFloat(row[col2])])
        .filter(
          ([a, b]) => !isNaN(a) && !isNaN(b) && isFinite(a) && isFinite(b)
        );

      if (pairs.length > 0) {
        const corr = calculatePearsonCorrelation(pairs);
        correlations.push({
          col1,
          col2,
          correlation: corr.toFixed(3),
        });
      }
    }
  }
  return correlations.sort(
    (a, b) => Math.abs(parseFloat(b.correlation)) - Math.abs(parseFloat(a.correlation))
  );
};

export const analyzeData = (parsedData: any[]): AnalysisResult => {
  const columns = Object.keys(parsedData[0]);
  const columnAnalysis: Record<string, ColumnAnalysis> = {};

  columns.forEach((col) => {
    const values = parsedData.map((row) => row[col]);
    const type = detectColumnType(values);
    const missing = values.filter(
      (v) => v === null || v === undefined || v === ''
    ).length;

    columnAnalysis[col] = {
      type,
      missing,
      missingPercent: ((missing / values.length) * 100).toFixed(1),
      stats: type === 'numeric' ? calculateStats(values) : null,
      unique: new Set(values.filter((v) => v !== null && v !== '')).size,
    };

    if (type === 'categorical' && columnAnalysis[col].unique! < 50) {
      const counts = _.countBy(
        values.filter((v) => v !== null && v !== '')
      );
      columnAnalysis[col].valueCounts = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15) as [string, number][];
    }
  });

  const numericColumns = columns.filter(
    (col) => columnAnalysis[col].type === 'numeric'
  );
  const correlations = calculateCorrelations(parsedData, numericColumns);

  return {
    rowCount: parsedData.length,
    columnCount: columns.length,
    columns: columnAnalysis,
    correlations,
    numericColumns,
    categoricalColumns: columns.filter(
      (col) => columnAnalysis[col].type === 'categorical'
    ),
    dateColumns: columns.filter(
      (col) => columnAnalysis[col].type === 'datetime'
    ),
  };
};

export const detectInfiniteValues = (parsedData: any[]) => {
  const columns = Object.keys(parsedData[0]);
  const infStats: Record<string, { count: number; percentage: string }> = {};
  let hasInf = false;

  columns.forEach((col) => {
    const values = parsedData.map((row) => row[col]);
    const infCount = values.filter(
      (v) => typeof v === 'number' && !isFinite(v)
    ).length;
    if (infCount > 0) {
      hasInf = true;
      infStats[col] = {
        count: infCount,
        percentage: ((infCount / values.length) * 100).toFixed(1),
      };
    }
  });

  return { hasInf, infStats };
};

export const detectDuplicates = (parsedData: any[]) => {
  const columns = Object.keys(parsedData[0]);
  const dupStats: Record<string, any> = {};

  columns.forEach((col) => {
    const values = parsedData
      .map((row) => row[col])
      .filter((v) => v !== null && v !== undefined && v !== '');
    const uniqueValues = new Set(values);
    const duplicateCount = values.length - uniqueValues.size;
    const duplicatePercentage =
      values.length > 0
        ? ((duplicateCount / values.length) * 100).toFixed(1)
        : '0';

    if (duplicateCount > 0) {
      const valueCounts: Record<string, number> = {};
      values.forEach((val) => {
        valueCounts[val] = (valueCounts[val] || 0) + 1;
      });

      const topDuplicates = Object.entries(valueCounts)
        .filter(([_, count]) => count > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([value, count]) => ({
          value: String(value).substring(0, 30),
          count,
        }));

      dupStats[col] = {
        duplicateCount,
        duplicatePercentage,
        totalValues: values.length,
        uniqueValues: uniqueValues.size,
        topDuplicates,
      };
    }
  });

  return dupStats;
};


