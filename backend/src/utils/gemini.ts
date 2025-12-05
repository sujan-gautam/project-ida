import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
if (!apiKey) {
  console.warn('Warning: GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(apiKey);

// Chat mode types
export type ChatMode = 'beginner' | 'intermediate' | 'advanced';

const getModeInstructions = (mode: ChatMode): string => {
  switch (mode) {
    case 'beginner':
      return `You are a friendly data analysis assistant helping a beginner. 
- Use simple, non-technical language
- Avoid jargon and technical terms when possible (or explain them clearly)
- Provide step-by-step explanations
- Use analogies and examples
- Focus on actionable insights that are easy to understand
- Break down complex concepts into digestible parts
- Be encouraging and supportive
- Format responses with clear sections and visual breaks
- Give one sentence clear answer for small questions and ask user if they wanna deep dive
-Try to give short answer one sentence at most`;

    case 'intermediate':
      return `You are an experienced data analysis assistant helping someone with intermediate knowledge.
- Use technical terms but provide brief explanations when needed
- Balance detailed analysis with practical insights
- Include relevant statistics and metrics
- Explain methodologies briefly
- Focus on actionable recommendations
- Connect insights to business or practical applications
- Use professional formatting with good structure`;

    case 'advanced':
      return `You are an expert data scientist and analyst working with a professional.
- Use technical terminology freely
- Provide in-depth statistical and analytical insights
- Include detailed methodologies and calculations
- Reference advanced concepts (ML, feature engineering, statistical tests, etc.)
- Provide comprehensive, production-ready recommendations
- Include edge cases and advanced considerations
- Use precise technical language
- Focus on optimization and best practices
- Provide detailed code examples or pseudocode when relevant`;

    default:
      return '';
  }
};

// Helper function to build comprehensive dataset summary
const buildDatasetSummary = (analysis: any): string => {
  const columns = analysis.columns || {};
  const columnEntries = Object.entries(columns);
  
  // Build detailed column information
  const columnDetails = columnEntries.map(([name, info]: [string, any]) => {
    const details = [`**${name}** (${info.type})`];
    details.push(`- Unique values: ${info.unique}`);
    details.push(`- Missing: ${info.missing} (${info.missingPercent}%)`);
    
    if (info.stats) {
      details.push(`- Mean: ${info.stats.mean}, Median: ${info.stats.median}`);
      details.push(`- Range: [${info.stats.min}, ${info.stats.max}]`);
      details.push(`- Std Dev: ${info.stats.std}`);
      if (info.stats.outliers > 0) {
        details.push(`- ⚠️ Outliers: ${info.stats.outliers}`);
      }
    }
    
    if (info.valueCounts && info.valueCounts.length > 0) {
      const topValues = info.valueCounts.slice(0, 3).map(([val, count]: [string, number]) => 
        `"${val}" (${count}x)`
      ).join(', ');
      details.push(`- Top values: ${topValues}`);
    }
    
    return details.join('\n');
  }).join('\n\n');

  // Build correlation insights
  const topCorrelations = (analysis.correlations || [])
    .slice(0, 5)
    .map((corr: any) => 
      `- **${corr.col1}** ↔ **${corr.col2}**: ${parseFloat(corr.correlation).toFixed(3)}`
    )
    .join('\n');

  // Build data quality summary
  const columnsWithMissing = columnEntries.filter(([_, info]: [string, any]) => info.missing > 0);
  const columnsWithIssues = columnsWithMissing.length;
  const totalMissing = columnEntries.reduce((sum: number, [_, info]: [string, any]) => 
    sum + info.missing, 0
  );
  const completeness = ((1 - totalMissing / (analysis.rowCount * analysis.columnCount)) * 100).toFixed(1);
  
  // Calculate data quality score
  const missingPercent = (totalMissing / (analysis.rowCount * analysis.columnCount)) * 100;
  const duplicatePercent = analysis.duplicateStats ? 
    Object.values(analysis.duplicateStats).reduce((sum: number, stats: any) => 
      sum + parseFloat(stats.duplicatePercentage || '0'), 0
    ) / Object.keys(analysis.duplicateStats).length : 0;
  const infinitePercent = analysis.hasInfiniteValues ? 5 : 0; // Estimate
  const qualityScore = Math.max(0, 100 - missingPercent - (duplicatePercent * 0.5) - infinitePercent);

  return `# 📊 COMPREHENSIVE DATASET ANALYSIS REPORT

## Dataset Structure
- **Total Rows:** ${analysis.rowCount?.toLocaleString() || 'N/A'}
- **Total Columns:** ${analysis.columnCount || 'N/A'}
- **Numeric Columns:** ${analysis.numericColumns?.length || 0}
- **Categorical Columns:** ${analysis.categoricalColumns?.length || 0}
- **Date/Time Columns:** ${analysis.dateColumns?.length || 0}

## Data Quality Metrics
- **Data Completeness:** ${completeness}%
- **Data Quality Score:** ${qualityScore.toFixed(1)}/100
- **Columns with Missing Values:** ${columnsWithIssues} out of ${analysis.columnCount}
- **Total Missing Values:** ${totalMissing.toLocaleString()} (${missingPercent.toFixed(2)}% of all cells)
- **Infinite Values Detected:** ${analysis.hasInfiniteValues ? 'Yes ⚠️' : 'No ✓'}
- **Duplicate Values:** ${analysis.duplicateStats ? Object.keys(analysis.duplicateStats).length : 0} columns affected${analysis.duplicateStats ? `\n  - Details: ${Object.entries(analysis.duplicateStats).slice(0, 3).map(([col, stats]: [string, any]) => `${col} (${stats.duplicateCount} duplicates, ${stats.duplicatePercentage}%)`).join(', ')}` : ''}

## Column Analysis
${columnDetails}

## Correlation Insights
${topCorrelations || 'No significant correlations found (need at least 2 numeric columns)'}

## Statistical Summary
- **Numeric Columns:** ${analysis.numericColumns?.length || 0} columns with statistical measures
- **Categorical Columns:** ${analysis.categoricalColumns?.length || 0} columns with value distributions
- **Date Columns:** ${analysis.dateColumns?.length || 0} temporal columns detected`;
};

export const generateSummary = async (
  analysis: any,
  prompt?: string,
  mode: ChatMode = 'intermediate'
): Promise<string> => {
  try {
    // Use gemini-pro for v1 API compatibility
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const comprehensiveSummary = buildDatasetSummary(analysis);
    const fullAnalysisContext = JSON.stringify(analysis, null, 2);
    const modeInstructions = getModeInstructions(mode);

    const defaultPrompt = `You are an expert data scientist and analyst. I have provided you with a complete dataset analysis below. Your task is to automatically generate a comprehensive, detailed summary report without asking for additional information.

**Your Communication Style:**
${modeInstructions}

**IMPORTANT: You have ALL the analysis data you need. Generate a complete summary immediately using Markdown syntax with proper formatting.**

${comprehensiveSummary}

## Complete Analysis Data (Full JSON for Deep Context):
\`\`\`json
${fullAnalysisContext}
\`\`\`

## Your Task - Generate Complete Summary:
Based on the comprehensive dataset analysis provided above, automatically generate a detailed, professional summary report. DO NOT ask for more information - you have everything needed.

### Required Sections (Generate ALL of these):

#### 1. 📊 Executive Summary
Provide a high-level overview including:
- Dataset dimensions (rows × columns)
- Overall data structure and composition
- Data quality score (calculate: 100 - (missing% + duplicate% + infinite% issues))
- Key highlights and main findings

#### 2. 🔍 Detailed Data Quality Analysis
For each column with issues, provide:
- **Missing Values:** List columns with missing data, percentages, and impact
- **Duplicate Values:** Identify columns with high duplication rates
- **Infinite Values:** Report any infinite value issues
- **Data Completeness:** Overall completeness percentage
- **Data Quality Score:** Calculate and explain (0-100 scale)

#### 3. 📈 Statistical Insights & Patterns
Provide detailed insights:
- **Numeric Columns:** Distribution patterns, central tendencies, ranges, outliers
- **Categorical Columns:** Value distributions, top categories, cardinality
- **Correlations:** Strong relationships between variables (list top 5-10)
- **Outliers:** Columns with significant outliers and their impact
- **Patterns:** Notable trends, clusters, or anomalies discovered

#### 4. 💡 Actionable Recommendations
Provide specific, prioritized recommendations:
- **Data Cleaning:** Steps to handle missing values, duplicates, infinite values
- **Preprocessing:** Feature engineering suggestions, encoding strategies
- **Data Quality Improvements:** Specific actions to improve data quality
- **ML Preparation:** Feature selection, normalization needs, model considerations
- **Further Analysis:** Suggested deep-dive analyses or investigations

#### 5. ⚠️ Critical Issues & Warnings
Highlight potential problems:
- Data quality concerns that need immediate attention
- Missing data patterns that could bias analysis
- Anomalies or inconsistencies detected
- Columns that may need special handling

#### 6. 📋 Column-by-Column Summary
For each column, provide:
- Data type and purpose
- Key statistics (if numeric) or value distribution (if categorical)
- Data quality status (clean, has issues, needs attention)
- Specific recommendations for that column

**Formatting Requirements:**
- Use **bold** for key metrics, numbers, and critical findings
- Use *italic* for emphasis and explanatory notes
- Use \`code\` for column names, technical terms, and code snippets
- Use bullet points (\`-\`) for lists
- Use numbered lists (1., 2., 3.) for step-by-step recommendations
- Use \`\`\`code blocks\`\`\` for statistics, JSON snippets, or data examples
- Use tables for comparing columns, metrics, or statistics
- Use headers (##, ###) for clear section organization
- Include emojis for visual clarity (📊, 🔍, ⚠️, 💡, ✅, 📈, 🎯, etc.)

**CRITICAL INSTRUCTIONS:**
1. You have been provided with COMPLETE dataset analysis data above (summary + full JSON)
2. Generate the summary IMMEDIATELY - do not ask for more information
3. Use ALL the data provided (comprehensive summary + full JSON) for deep context understanding
4. Be specific with numbers, percentages, and column names from the analysis
5. Provide actionable recommendations based on the actual data issues found
6. Include concrete examples from the dataset (column names, statistics, etc.)
7. Adapt your communication style to ${mode} mode (see instructions above)
8. Make the summary detailed enough that a user at ${mode} level can act on it immediately
9. Reference specific data points from the full JSON context for precision

**Start generating the summary now. Do not include any text asking for more information.**`;

    const finalPrompt = prompt || defaultPrompt;

    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error('Gemini API error:', error);
    const errorMessage = error.message || 'Unknown error';
    
    // Provide more helpful error messages
    if (errorMessage.includes('API_KEY')) {
      throw new Error('Gemini API key is missing or invalid. Please check your GEMINI_API_KEY environment variable.');
    } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      throw new Error('Gemini model not found. Please check if the model name is correct.');
    } else {
      throw new Error(`Failed to generate summary: ${errorMessage}`);
    }
  }
};

export const chatWithGemini = async (
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  analysis: any,
  userMessage: string,
  mode: ChatMode = 'intermediate'
): Promise<string> => {
  try {
    // Use gemini-pro for v1 API compatibility
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Build full conversation history for context (use all messages, not just last 5)
    const conversationHistory = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    // Build comprehensive context from analysis with FULL dataset context
    const comprehensiveSummary = buildDatasetSummary(analysis);
    
    // Include full analysis JSON for deep context understanding
    const fullAnalysisContext = JSON.stringify(analysis, null, 2);
    
    const modeInstructions = getModeInstructions(mode);

    const context = `You are a data analysis assistant with access to a comprehensive dataset analysis. You remember all previous conversations about this dataset.

**Your Role & Communication Style:**
${modeInstructions}

**IMPORTANT: Format your response using Markdown with proper headings, lists, code blocks, and emphasis for better readability.**

## Complete Dataset Analysis Context:

${comprehensiveSummary}

## Full Analysis Data (Complete JSON for Deep Context):
\`\`\`json
${fullAnalysisContext}
\`\`\`

${conversationHistory ? `\n## Previous Conversation History:\n${conversationHistory}\n\n` : ''}

**Current User Question:** ${userMessage}

Provide a helpful, accurate, and well-formatted Markdown response based on the comprehensive analysis data and conversation history. 

**Response Guidelines:**
- **Bold** for important points and metrics
- *Italic* for emphasis
- \`code\` for technical terms or column names
- Bullet points for lists
- Numbered lists for step-by-step instructions
- \`\`\`code blocks\`\`\` for statistics or data snippets
- Headers (##) for major sections
- Tables for comparing data
- Emojis for visual clarity (use appropriately based on mode)

**Context Awareness:**
- You have access to the ENTIRE dataset analysis including all columns, statistics, correlations, and quality metrics
- Reference specific columns, values, and statistics from the analysis
- Use the full JSON context to provide precise, data-driven insights
- Remember all previous conversations in this thread
- Connect insights across different aspects of the data

Remember the context from previous messages and format your response professionally according to the ${mode} mode guidelines.`;

    const result = await model.generateContent(context);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error('Gemini API error:', error);
    const errorMessage = error.message || 'Unknown error';
    
    // Provide more helpful error messages
    if (errorMessage.includes('API_KEY')) {
      throw new Error('Gemini API key is missing or invalid. Please check your GEMINI_API_KEY environment variable.');
    } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      throw new Error('Gemini model not found. Please check if the model name is correct.');
    } else {
      throw new Error(`Failed to generate response: ${errorMessage}`);
    }
  }
};

export const generateSuggestions = async (
  analysis: any,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  mode: ChatMode = 'intermediate'
): Promise<string[]> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const comprehensiveSummary = buildDatasetSummary(analysis);
    const recentMessages = conversationHistory.slice(-6); // Last 3 exchanges
    const context = recentMessages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const prompt = `Based on this dataset analysis and recent conversation, generate 5-8 contextual, actionable question suggestions for the user.

Dataset Context:
${comprehensiveSummary}

Recent Conversation:
${context || 'No conversation yet - suggest initial exploration questions'}

User Mode: ${mode}

Generate suggestions as a JSON array of strings. Make them:
- Contextually relevant to the dataset and conversation
- Actionable and specific
- Appropriate for ${mode} level
- Diverse (cover different aspects: quality, statistics, patterns, recommendations)
- Natural and conversational

Return ONLY a valid JSON array, no other text. Example format: ["question 1", "question 2", ...]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback suggestions
    return [
      'What are the main data quality issues?',
      'Show me key statistical insights',
      'What preprocessing steps do you recommend?',
      'Are there any notable patterns or correlations?',
      'What ML models would work best for this data?'
    ];
  } catch (error: any) {
    console.error('Suggestion generation error:', error);
    // Return fallback suggestions
    return [
      'What are the main data quality issues?',
      'Show me key statistical insights',
      'What preprocessing steps do you recommend?',
      'Are there any notable patterns or correlations?',
      'What ML models would work best for this data?'
    ];
  }
};
