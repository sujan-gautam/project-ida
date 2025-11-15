interface AnalyzerSession {
  datasetId: string | null;
  activeTab: string;
  preprocessingSteps: string[];
  fileName: string;
  timestamp: number;
}

const SESSION_KEY = 'analyzer_session';
const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export const sessionStorage = {
  save: (session: AnalyzerSession) => {
    try {
      const data = {
        ...session,
        timestamp: Date.now(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  },

  load: (): AnalyzerSession | null => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;

      const session = JSON.parse(stored) as AnalyzerSession & { timestamp: number };
      
      // Check if session expired
      if (Date.now() - session.timestamp > SESSION_EXPIRY) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }

      return {
        datasetId: session.datasetId,
        activeTab: session.activeTab || 'overview',
        preprocessingSteps: session.preprocessingSteps || [],
        fileName: session.fileName || '',
        timestamp: session.timestamp,
      };
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  },

  clear: () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  },

  updateTab: (activeTab: string) => {
    const session = sessionStorage.load();
    if (session) {
      sessionStorage.save({
        ...session,
        activeTab,
      });
    }
  },

  updatePreprocessingSteps: (steps: string[]) => {
    const session = sessionStorage.load();
    if (session) {
      sessionStorage.save({
        ...session,
        preprocessingSteps: steps,
      });
    }
  },
};

