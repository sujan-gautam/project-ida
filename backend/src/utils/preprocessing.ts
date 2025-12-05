import { AnalysisResult } from './analysis';
import _ from 'lodash';

export const replaceInfiniteWithNaN = (data: any[]) => {
  return data.map((row) => {
    const newRow: any = {};
    Object.keys(row).forEach((key) => {
      const val = row[key];
      newRow[key] =
        typeof val === 'number' && !isFinite(val) ? null : val;
    });
    return newRow;
  });
};

export const handleMissingValues = (
  data: any[],
  method: string,
  analysis: AnalysisResult
) => {
  let cleanedData = [...data];

  if (method === 'dropRows') {
    cleanedData = cleanedData.filter((row) => {
      return Object.values(row).every(
        (val) => val !== null && val !== undefined && val !== ''
      );
    });
  } else if (method === 'dropColumns') {
    const columns = Object.keys(data[0]);
    const columnsToKeep = columns.filter((col) => {
      const values = data.map((row) => row[col]);
      return values.every(
        (val) => val !== null && val !== undefined && val !== ''
      );
    });

    cleanedData = cleanedData.map((row) => {
      const newRow: any = {};
      columnsToKeep.forEach((col) => {
        newRow[col] = row[col];
      });
      return newRow;
    });
  } else if (method === 'fillMean') {
    const columns = Object.keys(data[0]);
    columns.forEach((col) => {
      const values = data
        .map((row) => row[col])
        .filter((v) => !isNaN(v) && v !== null && v !== '' && isFinite(v));
      if (values.length > 0) {
        const mean =
          values.reduce((a, b) => Number(a) + Number(b), 0) / values.length;
        cleanedData = cleanedData.map((row) => ({
          ...row,
          [col]:
            row[col] === null || row[col] === undefined || row[col] === ''
              ? mean
              : row[col],
        }));
      }
    });
  } else if (method === 'fillMedian') {
    const columns = Object.keys(data[0]);
    columns.forEach((col) => {
      const values = data
        .map((row) => row[col])
        .filter((v) => !isNaN(v) && v !== null && v !== '' && isFinite(v))
        .sort((a, b) => Number(a) - Number(b));
      if (values.length > 0) {
        const median = values[Math.floor(values.length / 2)];
        cleanedData = cleanedData.map((row) => ({
          ...row,
          [col]:
            row[col] === null || row[col] === undefined || row[col] === ''
              ? median
              : row[col],
        }));
      }
    });
  } else if (method === 'fillMode') {
    const columns = Object.keys(data[0]);
    columns.forEach((col) => {
      const values = data
        .map((row) => row[col])
        .filter((v) => v !== null && v !== undefined && v !== '');
      if (values.length > 0) {
        const counts = _.countBy(values);
        const mode = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        cleanedData = cleanedData.map((row) => ({
          ...row,
          [col]:
            row[col] === null || row[col] === undefined || row[col] === ''
              ? mode
              : row[col],
        }));
      }
    });
  } else if (method === 'fillZero') {
    cleanedData = cleanedData.map((row) => {
      const newRow: any = {};
      Object.keys(row).forEach((key) => {
        newRow[key] =
          row[key] === null || row[key] === undefined || row[key] === ''
            ? 0
            : row[key];
      });
      return newRow;
    });
  }

  return cleanedData;
};

export const applyCategoricalEncoding = (
  data: any[],
  method: string,
  categoricalCols: string[]
) => {
  let encodedData = [...data];

  if (method === 'label') {
    categoricalCols.forEach((col) => {
      const uniqueValues = [
        ...new Set(
          data
            .map((row) => row[col])
            .filter((v) => v !== null && v !== undefined && v !== '')
        ),
      ];
      const labelMap: Record<string, number> = {};
      uniqueValues.forEach((val, idx) => {
        labelMap[val] = idx;
      });

      encodedData = encodedData.map((row) => ({
        ...row,
        [col]:
          row[col] !== null && row[col] !== undefined && row[col] !== ''
            ? labelMap[row[col]]
            : null,
      }));
    });
  } else if (method === 'onehot') {
    categoricalCols.forEach((col) => {
      const uniqueValues = [
        ...new Set(
          data
            .map((row) => row[col])
            .filter((v) => v !== null && v !== undefined && v !== '')
        ),
      ];

      encodedData = encodedData.map((row) => {
        const newRow: any = { ...row };
        delete newRow[col];

        uniqueValues.forEach((val) => {
          newRow[`${col}_${val}`] = row[col] === val ? 1 : 0;
        });

        return newRow;
      });
    });
  }

  return encodedData;
};

export const applyNormalization = (
  data: any[],
  method: string,
  numericCols: string[]
) => {
  let normalizedData = [...data];

  if (method === 'minmax') {
    numericCols.forEach((col) => {
      const values = data
        .map((row) => row[col])
        .filter((v) => !isNaN(v) && v !== null && v !== '' && isFinite(v))
        .map(Number);
      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;

        if (range > 0) {
          normalizedData = normalizedData.map((row) => ({
            ...row,
            [col]:
              !isNaN(row[col]) &&
                row[col] !== null &&
                row[col] !== '' &&
                isFinite(row[col])
                ? (Number(row[col]) - min) / range
                : row[col],
          }));
        }
      }
    });
  } else if (method === 'standard') {
    numericCols.forEach((col) => {
      const values = data
        .map((row) => row[col])
        .filter((v) => !isNaN(v) && v !== null && v !== '' && isFinite(v))
        .map(Number);
      if (values.length > 0) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance =
          values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
          values.length;
        const std = Math.sqrt(variance);

        if (std > 0) {
          normalizedData = normalizedData.map((row) => ({
            ...row,
            [col]:
              !isNaN(row[col]) &&
                row[col] !== null &&
                row[col] !== '' &&
                isFinite(row[col])
                ? (Number(row[col]) - mean) / std
                : row[col],
          }));
        }
      }
    });
  }

  return normalizedData;
};

export const preprocessData = async (
  data: any[],
  options: {
    handleInfinite?: boolean;
    missingValueMethod?: string;
    encodingMethod?: string;
    normalizationMethod?: string;
    analysis?: AnalysisResult;
  }
) => {
  let processedData = [...data];

  // 1. Handle Infinite Values
  if (options.handleInfinite) {
    processedData = replaceInfiniteWithNaN(processedData);
  }

  // 2. Handle Missing Values
  if (options.missingValueMethod && options.analysis) {
    processedData = handleMissingValues(
      processedData,
      options.missingValueMethod,
      options.analysis
    );
  }

  // 3. Categorical Encoding
  if (options.encodingMethod && options.analysis) {
    const categoricalCols = Object.entries(options.analysis.columns)
      .filter(([_, col]) => col.type === 'categorical')
      .map(([name, _]) => name);

    if (categoricalCols.length > 0) {
      processedData = applyCategoricalEncoding(
        processedData,
        options.encodingMethod,
        categoricalCols
      );
    }
  }

  // 4. Normalization
  if (options.normalizationMethod && options.analysis) {
    const numericCols = Object.entries(options.analysis.columns)
      .filter(([_, col]) => col.type === 'numeric')
      .map(([name, _]) => name);

    if (numericCols.length > 0) {
      processedData = applyNormalization(
        processedData,
        options.normalizationMethod,
        numericCols
      );
    }
  }

  return processedData;
};


