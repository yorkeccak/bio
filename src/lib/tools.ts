import { z } from "zod";
import { tool } from "ai";
import { Valyu } from "valyu-js";
import { track } from "@vercel/analytics/server";
import { PolarEventTracker } from '@/lib/polar-events';
import { Daytona } from '@daytonaio/sdk';


export const healthcareTools = {
  // Chart Creation Tool - Create interactive charts for data visualization
  createChart: tool({
    description: `Create interactive charts for clinical and research data visualization. 
    
    CRITICAL: ALL FIVE FIELDS ARE REQUIRED:
    1. title - Chart title (e.g., "Drug Efficacy Comparison", "Patient Response Rates")
    2. type - Chart type: "line", "bar", or "area" 
    3. xAxisLabel - X-axis label (e.g., "Time (weeks)", "Treatment Group")
    4. yAxisLabel - Y-axis label (e.g., "Response Rate (%)", "Survival Probability")
    5. dataSeries - Array of data series with this exact format:
    
    Example complete tool call:
    {
      "title": "CAR-T vs Chemotherapy Response Rates",
      "type": "line",
      "xAxisLabel": "Weeks Since Treatment",
      "yAxisLabel": "Response Rate (%)",
      "dataSeries": [
        {
          "name": "CAR-T Therapy",
          "data": [
            {"x": "Week 0", "y": 0},
            {"x": "Week 4", "y": 65.5},
            {"x": "Week 8", "y": 78.2}
          ]
        },
        {
          "name": "Standard Chemotherapy",
          "data": [
            {"x": "Week 0", "y": 0},
            {"x": "Week 4", "y": 32.1},
            {"x": "Week 8", "y": 38.5}
          ]
        }
      ]
    }
    
    NEVER omit any of the five required fields. Each data point must have x (date/label) and y (numeric value).`,
    inputSchema: z.object({
      title: z
        .string()
        .describe('Chart title (e.g., "Apple vs Microsoft Stock Performance")'),
      type: z
        .enum(["line", "bar", "area"])
        .describe(
          'Chart type - use "line" for time series data like stock prices'
        ),
      xAxisLabel: z
        .string()
        .describe('X-axis label (e.g., "Date", "Quarter", "Year")'),
      yAxisLabel: z
        .string()
        .describe(
          'Y-axis label (e.g., "Price ($)", "Revenue (Millions)", "Percentage (%)")'
        ),
      dataSeries: z
        .array(
          z.object({
            name: z
              .string()
              .describe(
                'Series name - include company/ticker for stocks (e.g., "Apple (AAPL)", "Tesla Revenue")'
              ),
            data: z
              .array(
                z.object({
                  x: z
                    .union([z.string(), z.number()])
                    .describe(
                      'X-axis value - use date strings like "2024-01-01" for time series'
                    ),
                  y: z
                    .number()
                    .describe(
                      "Y-axis numeric value - stock price, revenue, percentage, etc."
                    ),
                })
              )
              .describe(
                "Array of data points with x (date/label) and y (value) properties"
              ),
          })
        )
        .describe(
          "REQUIRED: Array of data series - each series has name and data array with x,y objects"
        ),
      description: z
        .string()
        .optional()
        .describe("Optional description explaining what the chart shows"),
    }),
    execute: async ({
      title,
      type,
      xAxisLabel,
      yAxisLabel,
      dataSeries,
      description,
    }) => {
      // Track chart creation
      await track('Chart Created', {
        chartType: type,
        title: title,
        seriesCount: dataSeries.length,
        totalDataPoints: dataSeries.reduce(
          (sum, series) => sum + series.data.length,
          0
        ),
        hasDescription: !!description
      });

      // Log chart creation details
      console.log("[Chart Creation] Creating chart:", {
        title,
        type,
        xAxisLabel,
        yAxisLabel,
        seriesCount: dataSeries.length,
        totalDataPoints: dataSeries.reduce(
          (sum, series) => sum + series.data.length,
          0
        ),
        seriesNames: dataSeries.map((s) => s.name),
      });

      // Return structured chart data for the UI to render
      const chartData = {
        chartType: type,
        title,
        xAxisLabel,
        yAxisLabel,
        dataSeries,
        description,
        metadata: {
          totalSeries: dataSeries.length,
          totalDataPoints: dataSeries.reduce(
            (sum, series) => sum + series.data.length,
            0
          ),
          dateRange:
            dataSeries.length > 0 && dataSeries[0].data.length > 0
              ? {
                  start: dataSeries[0].data[0].x,
                  end: dataSeries[0].data[dataSeries[0].data.length - 1].x,
                }
              : null,
        },
      };

      console.log(
        "[Chart Creation] Chart data size:",
        JSON.stringify(chartData).length,
        "bytes"
      );

      return chartData;
    },
  }),

  codeExecution: tool({
    description: `Execute Python code securely in a Daytona Sandbox for financial modeling, data analysis, and calculations. CRITICAL: Always include print() statements to show results. Daytona can also capture rich artifacts (e.g., charts) when code renders images.

    REQUIRED FORMAT - Your Python code MUST include print statements:
    
    Example for financial calculations:
    # Calculate compound interest
    principal = 10000
    rate = 0.07
    time = 5
    amount = principal * (1 + rate) ** time
    print(f"Initial investment: $\{principal:,.2f}")
    print(f"Annual interest rate: \{rate*100:.1f}%")
    print(f"Time period: \{time} years")
    print(f"Final amount: $\{amount:,.2f}")
    print(f"Interest earned: $\{amount - principal:,.2f}")
    
    Example for data analysis:
    import math
    values = [100, 150, 200, 175, 225]
    average = sum(values) / len(values)
    std_dev = math.sqrt(sum((x - average) ** 2 for x in values) / len(values))
    print(f"Data: \{values}")
    print(f"Average: \{average:.2f}")
    print(f"Standard deviation: \{std_dev:.2f}")
    
    IMPORTANT: 
    - Always end with print() statements showing final results
    - Use descriptive labels and proper formatting
    - Include units, currency symbols, or percentages where appropriate
    - Show intermediate steps for complex calculations`,
    inputSchema: z.object({
      code: z
        .string()
        .describe(
          "Python code to execute - MUST include print() statements to display results. Use descriptive output formatting with labels, units, and proper number formatting."
        ),
      description: z
        .string()
        .optional()
        .describe(
          'Brief description of what the calculation or analysis does (e.g., "Calculate future value with compound interest", "Analyze portfolio risk metrics")'
        ),
    }),
    execute: async ({ code, description }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
      
      const startTime = Date.now();

      try {
        console.log("[Code Execution] Executing Python code:", {
          description,
          codeLength: code.length,
          codePreview: code.substring(0, 100) + "...",
        });

        // Check for reasonable code length
        if (code.length > 10000) {
          return '🚫 **Error**: Code too long. Please limit your code to 10,000 characters.';
        }

        // Initialize Daytona client
        const daytonaApiKey = process.env.DAYTONA_API_KEY;
        if (!daytonaApiKey) {
          return '❌ **Configuration Error**: Daytona API key is not configured. Please set DAYTONA_API_KEY in your environment.';
        }

        const daytona = new Daytona({
          apiKey: daytonaApiKey,
          // Optional overrides if provided
          serverUrl: process.env.DAYTONA_API_URL,
          target: (process.env.DAYTONA_TARGET as any) || undefined,
        });

        let sandbox: any | null = null;
        try {
          // Create a Python sandbox
          sandbox = await daytona.create({ language: 'python' });

          // Execute the user's code
          const execution = await sandbox.process.codeRun(code);
          const executionTime = Date.now() - startTime;

          // Track code execution
          await track('Python Code Executed', {
            success: execution.exitCode === 0,
            codeLength: code.length,
            outputLength: execution.result?.length || 0,
            executionTime: executionTime,
            hasDescription: !!description,
            hasError: execution.exitCode !== 0,
            hasArtifacts: !!execution.artifacts
          });

          // Track usage for pay-per-use customers with Polar events
          if (userId && sessionId && userTier === 'pay_per_use' && execution.exitCode === 0 && !isDevelopment) {
            try {
              const polarTracker = new PolarEventTracker();
              
              console.log('[CodeExecution] Tracking Daytona usage with Polar:', {
                userId,
                sessionId,
                executionTime
              });
              
              await polarTracker.trackDaytonaUsage(
                userId,
                sessionId,
                executionTime,
                {
                  codeLength: code.length,
                  hasArtifacts: !!execution.artifacts,
                  success: execution.exitCode === 0,
                  description: description || 'Code execution'
                }
              );
            } catch (error) {
              console.error('[CodeExecution] Failed to track Daytona usage:', error);
              // Don't fail the tool execution if usage tracking fails
            }
          }

          // Handle execution errors
          if (execution.exitCode !== 0) {
            // Provide helpful error messages for common issues
            let helpfulError = execution.result || 'Unknown execution error';
            if (helpfulError.includes('NameError')) {
              helpfulError = `${helpfulError}\n\n💡 **Tip**: Make sure all variables are defined before use. If you're trying to calculate something, include the full calculation in your code.`;
            } else if (helpfulError.includes('SyntaxError')) {
              helpfulError = `${helpfulError}\n\n💡 **Tip**: Check your Python syntax. Make sure all parentheses, quotes, and indentation are correct.`;
            } else if (helpfulError.includes('ModuleNotFoundError')) {
              helpfulError = `${helpfulError}\n\n💡 **Tip**: You can install packages inside the Daytona sandbox using pip if needed (e.g., pip install numpy).`;
            }

            return `❌ **Execution Error**: ${helpfulError}`;
          }

          console.log("[Code Execution] Success:", {
            outputLength: execution.result?.length || 0,
            executionTime,
            hasArtifacts: !!execution.artifacts,
          });

          // Format the successful execution result
          return `🐍 **Python Code Execution (Daytona Sandbox)**
${description ? `**Description**: ${description}\n` : ""}

\`\`\`python
${code}
\`\`\`

**Output:**
\`\`\`
${execution.result || "(No output produced)"}
\`\`\`

⏱️ **Execution Time**: ${executionTime}ms`;

        } finally {
          // Clean up sandbox
          try {
            if (sandbox) {
              await sandbox.delete();
            }
          } catch (cleanupError) {
            console.error('[CodeExecution] Failed to delete Daytona sandbox:', cleanupError);
          }
        }
        
      } catch (error: any) {
        console.error('[CodeExecution] Error:', error);
        
        return `❌ **Error**: Failed to execute Python code. ${error.message || 'Unknown error occurred'}`;
      }
    },
  }),

  financialSearch: tool({
    description:
      "Search for comprehensive financial data including real-time market data, earnings reports, SEC filings, regulatory updates, and financial news using Valyu DeepSearch API",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          'Financial search query (e.g., "Apple latest quarterly earnings", "Bitcoin price trends", "Tesla SEC filings")'
        ),
      dataType: z
        .enum([
          "auto",
          "market_data",
          "earnings",
          "sec_filings",
          "news",
          "regulatory",
        ])
        .optional()
        .describe("Type of financial data to focus on"),
      maxResults: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .default(10)
        .describe(
          "Maximum number of results to return. This is not number of daya/hours of stock data, for example 1 yr of stock data for 1 company is 1 result"
        ),
    }),
    execute: async ({ query, dataType, maxResults }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
      
      try {
        // Check if Valyu API key is available
        const apiKey = process.env.VALYU_API_KEY;
        if (!apiKey) {
          return "❌ Valyu API key not configured. Please add VALYU_API_KEY to your environment variables to enable financial search.";
        }
        const valyu = new Valyu(apiKey, "https://stage.api.valyu.network/v1");

        // Configure search based on data type
        let searchOptions: any = {
          maxNumResults: maxResults || 10,
        };

        const response = await valyu.search(query, searchOptions);

        // Track Valyu financial search call
        await track('Valyu API Call', {
          toolType: 'financialSearch',
          query: query,
          dataType: dataType || 'auto',
          maxResults: maxResults || 10,
          resultCount: response?.results?.length || 0,
          hasApiKey: !!apiKey,
          cost: (response as any)?.total_deduction_dollars || null,
          txId: (response as any)?.tx_id || null
        });

        // Track usage for pay-per-use customers with Polar events
        console.log('[FinancialSearch] Tracking Valyu API usage with Polar:', {
          userId,
          sessionId,
          userTier,
          isDevelopment
        });

        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          console.log('[FinancialSearch] Tracking Valyu API usage with Polar:');
          try {
            const polarTracker = new PolarEventTracker();
            // Use the actual Valyu API cost from response
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            
            // Bright green color: \x1b[92m ... \x1b[0m
            console.log(
              '\x1b[92m[FinancialSearch] Tracking Valyu API usage with Polar:\x1b[0m',
              {
                userId,
                sessionId,
                valyuCostDollars,
                resultCount: response?.results?.length || 0
              }
            );
            
            await polarTracker.trackValyuAPIUsage(
              userId,
              sessionId,
              'financialSearch',
              valyuCostDollars,
              {
                query,
                resultCount: response?.results?.length || 0,
                dataType: dataType || 'auto',
                success: true,
                tx_id: (response as any)?.tx_id
              }
            );
          } catch (error) {
            console.error('[FinancialSearch] Failed to track Valyu API usage:', error);
            // Don't fail the search if usage tracking fails
          }
        }

        // // Log the full API response for debugging
        // console.log(
        //   "[Financial Search] Full API Response:",
        //   JSON.stringify(response, null, 2)
        // );

        if (!response || !response.results || response.results.length === 0) {
          return `🔍 No financial data found for "${query}". Try rephrasing your search or checking if the company/symbol exists.`;
        }

        // // Log key information about the search
        // console.log("[Financial Search] Summary:", {
        //   query,
        //   dataType,
        //   resultCount: response.results.length,
        //   totalCost: (response as any).price || "N/A",
        //   txId: (response as any).tx_id || "N/A",
        //   firstResultTitle: response.results[0]?.title,
        //   firstResultLength: response.results[0]?.length,
        // });

        // Return structured data for the model to process
        const formattedResponse = {
          type: "financial_search",
          query: query,
          dataType: dataType,
          resultCount: response.results.length,
          results: response.results.map((result: any) => ({
            title: result.title || "Financial Data",
            url: result.url,
            content: result.content,
            date: result.metadata?.date,
            source: result.metadata?.source,
            dataType: result.data_type,
            length: result.length,
            image_url: result.image_url || {},
            relevance_score: result.relevance_score,
          })),
        };

        console.log(
          "[Financial Search] Formatted response size:",
          JSON.stringify(formattedResponse).length,
          "bytes"
        );

        return JSON.stringify(formattedResponse, null, 2);
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message.includes("401") ||
            error.message.includes("unauthorized")
          ) {
            return "🔐 Invalid Valyu API key. Please check your VALYU_API_KEY environment variable.";
          }
          if (error.message.includes("429")) {
            return "⏱️ Rate limit exceeded. Please try again in a moment.";
          }
          if (
            error.message.includes("network") ||
            error.message.includes("fetch")
          ) {
            return "🌐 Network error connecting to Valyu API. Please check your internet connection.";
          }
        }

        return `❌ Error searching financial data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
      }
    },
  }),

  wileySearch: tool({
    description:
      "Wiley finance/business/accounting corpus search for authoritative academic content",
    inputSchema: z.object({
      query: z.string().describe("Search query for Wiley finance/business/accounting corpus"),
      maxResults: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .default(10)
        .describe("Maximum number of results to return"),
    }),
    execute: async ({ query, maxResults }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

      try {
        // Check if Valyu API key is available
        const apiKey = process.env.VALYU_API_KEY;
        if (!apiKey) {
          return "❌ Valyu API key not configured. Please add VALYU_API_KEY to your environment variables to enable Wiley search.";
        }
        const valyu = new Valyu(apiKey, "https://stage.api.valyu.network/v1");

        // Configure search options for Wiley sources
        const searchOptions: any = {
          maxNumResults: maxResults || 10,
          includedSources: [
            "wiley/wiley-finance-papers",
            "wiley/wiley-finance-books"
          ]
        };

        console.log('[WileySearch] Search options:', searchOptions);

        const response = await valyu.search(query, searchOptions);

        // Track Valyu Wiley search call
        await track('Valyu API Call', {
          toolType: 'wileySearch',
          query: query,
          maxResults: maxResults || 10,
          resultCount: response?.results?.length || 0,
          hasApiKey: !!apiKey,
          cost: (response as any)?.total_deduction_dollars || null,
          txId: (response as any)?.tx_id || null
        });

        // Track usage for pay-per-use customers with Polar events
        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            console.log('[WileySearch] Tracking Valyu API usage with Polar:', {
              userId,
              sessionId,
              valyuCostDollars,
              resultCount: response?.results?.length || 0
            });
            await polarTracker.trackValyuAPIUsage(
              userId,
              sessionId,
              'wileySearch',
              valyuCostDollars,
              {
                query,
                resultCount: response?.results?.length || 0,
                success: true,
                tx_id: (response as any)?.tx_id
              }
            );
          } catch (error) {
            console.error('[WileySearch] Failed to track Valyu API usage:', error);
            // Don't fail the search if usage tracking fails
          }
        }

        if (!response || !response.results || response.results.length === 0) {
          return `🔍 No Wiley academic results found for "${query}". Try rephrasing your search.`;
        }

        // Return structured data for the model to process
        const formattedResponse = {
          type: "wiley_search",
          query: query,
          resultCount: response.results.length,
          results: response.results.map((result: any) => ({
            title: result.title || "Wiley Academic Result",
            url: result.url,
            content: result.content,
            date: result.metadata?.date,
            source: result.metadata?.source,
            dataType: result.data_type,
            length: result.length,
            image_url: result.image_url || {},
            relevance_score: result.relevance_score,
          })),
        };

        console.log(
          "[Wiley Search] Formatted response size:",
          JSON.stringify(formattedResponse).length,
          "bytes"
        );

        return JSON.stringify(formattedResponse, null, 2);
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message.includes("401") ||
            error.message.includes("unauthorized")
          ) {
            return "🔐 Invalid Valyu API key. Please check your VALYU_API_KEY environment variable.";
          }
          if (error.message.includes("429")) {
            return "⏱️ Rate limit exceeded. Please try again in a moment.";
          }
          if (
            error.message.includes("network") ||
            error.message.includes("fetch")
          ) {
            return "🌐 Network error connecting to Valyu API. Please check your internet connection.";
          }
        }

        return `❌ Error searching Wiley academic data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
      }
    },
  }),

  // Healthcare and Bio Tools
  clinicalTrialsSearch: tool({
    description:
      "Search for clinical trials based on conditions, drugs, or research criteria using ClinicalTrials.gov data",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          'Clinical trials search query (e.g., "Phase 3 melanoma immunotherapy", "COVID-19 vaccine trials", "CRISPR gene therapy")'
        ),
      maxResults: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .default(10)
        .describe("Maximum number of results to return"),
      startDate: z
        .string()
        .optional()
        .describe('Start date filter in MM-DD-YYYY format'),
      endDate: z
        .string()
        .optional()
        .describe('End date filter in MM-DD-YYYY format'),
    }),
    execute: async ({ query, maxResults, startDate, endDate }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
      
      try {
        const apiKey = process.env.VALYU_API_KEY;
        if (!apiKey) {
          return "❌ Valyu API key not configured. Please add VALYU_API_KEY to your environment variables to enable clinical trials search.";
        }
        const valyu = new Valyu(apiKey, "https://stage.api.valyu.network/v1");

        // Always request 6 results for UI display, but we'll limit what we send to the model
        const searchOptions: any = {
          maxNumResults: 6,  // Fixed at 6 for UI display
          searchType: 'proprietary',
          includedSources: ['valyu/valyu-clinical-trials'],
          relevanceThreshold: 0.4,
          isToolCall: true,
        };

        if (startDate) searchOptions.startDate = startDate;
        if (endDate) searchOptions.endDate = endDate;

        const response = await valyu.search(query, searchOptions);

        await track('Valyu API Call', {
          toolType: 'clinicalTrialsSearch',
          query: query,
          maxResults: maxResults || 10,
          resultCount: response?.results?.length || 0,
          hasApiKey: !!apiKey,
          cost: (response as any)?.total_deduction_dollars || null,
          txId: (response as any)?.tx_id || null
        });

        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            await polarTracker.trackValyuAPIUsage(
              userId,
              sessionId,
              'clinicalTrialsSearch',
              valyuCostDollars,
              {
                query,
                resultCount: response?.results?.length || 0,
                success: true,
                tx_id: (response as any)?.tx_id
              }
            );
          } catch (error) {
            console.error('[ClinicalTrialsSearch] Failed to track Valyu API usage:', error);
          }
        }

        if (!response || !response.results || response.results.length === 0) {
          return JSON.stringify({
            type: "clinical_trials",
            query: query,
            resultCount: 0,
            results: [],
            message: `No clinical trials found for "${query}". Try using different search terms or checking ClinicalTrials.gov directly.`
          }, null, 2);
        }

        // Extract overview information for each trial
        const extractOverview = (content: string) => {
          try {
            const data = JSON.parse(content);
            
            // Return just the key overview fields
            return {
              nct_id: data.nct_id,
              title: data.brief_title || data.official_title,
              status: data.overall_status,
              phase: data.phases,
              enrollment: data.enrollment_count,
              conditions: data.conditions,
              // Keep full brief summary - this is the most important part
              brief_summary: data.brief_summary || "No summary available",
              // Just the names of interventions
              interventions: data.interventions ? 
                data.interventions.slice(0, 3).map((i: any) => i.name).filter(Boolean) : [],
              start_date: data.start_date,
              completion_date: data.completion_date,
            };
          } catch (e) {
            console.error('Failed to parse clinical trial data:', e);
            return null;
          }
        };

        // Create overview version for both model and UI
        const overviewResults = response.results.map((result: any) => {
          const overview = extractOverview(result.content);
          if (!overview) return null;
          
          return {
            ...overview,
            url: result.url,
            source: "valyu/valyu-clinical-trials",
            dataType: "clinical_trials",
            relevance_score: result.relevance_score,
          };
        }).filter(Boolean);

        // Return overview results - this is what both model and UI will use
        const formattedResponse = {
          type: "clinical_trials_overview",
          query: query,
          resultCount: overviewResults.length,
          results: overviewResults,
          note: `Found ${overviewResults.length} clinical trials. Use 'getClinicalTrialDetails' tool with NCT ID for full details of any specific trial.`
        };

        return JSON.stringify(formattedResponse, null, 2);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("401") || error.message.includes("unauthorized")) {
            return "🔐 Invalid Valyu API key. Please check your VALYU_API_KEY environment variable.";
          }
        }
        return `❌ Error searching clinical trials: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
      }
    },
  }),

  getClinicalTrialDetails: tool({
    description: "Get full detailed information about a specific clinical trial using its NCT ID. Use this after finding trials with clinicalTrialsSearch to dive deeper into specific trials.",
    inputSchema: z.object({
      nctId: z.string().describe('The NCT ID of the clinical trial'),
    }),
    execute: async ({ nctId }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
      
      try {
        const apiKey = process.env.VALYU_API_KEY;
        if (!apiKey) {
          return "❌ Valyu API key not configured. Please add VALYU_API_KEY to your environment variables.";
        }
        const valyu = new Valyu(apiKey, "https://stage.api.valyu.network/v1");

        // Search for the specific NCT ID
        const searchOptions: any = {
          maxNumResults: 5,
          searchType: 'proprietary',
          includedSources: ['valyu/valyu-clinical-trials'],
          relevanceThreshold: 0.1, // Lower threshold since we're looking for exact match
          isToolCall: true,
        };

        const response = await valyu.search(`clinical trial: ${nctId}`, searchOptions);

        await track('Valyu API Call', {
          toolType: 'getClinicalTrialDetails',
          nctId: nctId,
          resultCount: response?.results?.length || 0,
          hasApiKey: !!apiKey,
          cost: (response as any)?.total_deduction_dollars || null,
          txId: (response as any)?.tx_id || null
        });

        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            await polarTracker.trackValyuAPIUsage(
              userId,
              sessionId,
              'getClinicalTrialDetails',
              valyuCostDollars,
              {
                nctId,
                resultCount: response?.results?.length || 0,
                success: true,
                tx_id: (response as any)?.tx_id
              }
            );
          } catch (error) {
            console.error('[GetClinicalTrialDetails] Failed to track Valyu API usage:', error);
          }
        }

        if (!response || !response.results || response.results.length === 0) {
          return JSON.stringify({
            type: "clinical_trial_details",
            nctId: nctId,
            found: false,
            message: `No clinical trial found with NCT ID: ${nctId}`
          }, null, 2);
        }

        // Parse the full trial data
        const result = response.results[0];
        let trialData;
        try {
          trialData = JSON.parse(result.content);
        } catch (e) {
          // If parsing fails, return the raw content
          return JSON.stringify({
            type: "clinical_trial_details",
            nctId: nctId,
            found: true,
            title: result.title,
            url: result.url,
            content: result.content,
            note: "Raw content provided - parsing failed"
          }, null, 2);
        }

        // Return the full parsed trial data
        const formattedResponse = {
          type: "clinical_trial_details",
          nctId: nctId,
          found: true,
          title: result.title,
          url: result.url,
          data: trialData, // Full trial data
          note: `Full details for clinical trial ${nctId}`
        };

        return JSON.stringify(formattedResponse, null, 2);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("401") || error.message.includes("unauthorized")) {
            return "🔐 Invalid Valyu API key. Please check your VALYU_API_KEY environment variable.";
          }
        }
        return `❌ Error fetching clinical trial details: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
      }
    },
  }),

  drugInformationSearch: tool({
    description:
      "Search FDA drug labels for medication information, warnings, contraindications using DailyMed data",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          'Drug information search query (e.g., "warfarin contraindications", "metformin side effects", "aspirin drug interactions")'
        ),
      maxResults: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(5)
        .describe("Maximum number of results to return"),
    }),
    execute: async ({ query, maxResults }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
      
      try {
        const apiKey = process.env.VALYU_API_KEY;
        if (!apiKey) {
          return "❌ Valyu API key not configured. Please add VALYU_API_KEY to your environment variables to enable drug information search.";
        }
        const valyu = new Valyu(apiKey, "https://stage.api.valyu.network/v1");

        const searchOptions: any = {
          maxNumResults: maxResults || 5,
          searchType: 'proprietary',
          includedSources: ['valyu/valyu-drug-labels'],
          relevanceThreshold: 0.5,
          isToolCall: true,
          responseLength: 'large',
        };

        const response = await valyu.search(query, searchOptions);

        await track('Valyu API Call', {
          toolType: 'drugInformationSearch',
          query: query,
          maxResults: maxResults || 5,
          resultCount: response?.results?.length || 0,
          hasApiKey: !!apiKey,
          cost: (response as any)?.total_deduction_dollars || null,
          txId: (response as any)?.tx_id || null
        });

        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            await polarTracker.trackValyuAPIUsage(
              userId,
              sessionId,
              'drugInformationSearch',
              valyuCostDollars,
              {
                query,
                resultCount: response?.results?.length || 0,
                success: true,
                tx_id: (response as any)?.tx_id
              }
            );
          } catch (error) {
            console.error('[DrugInformationSearch] Failed to track Valyu API usage:', error);
          }
        }

        if (!response || !response.results || response.results.length === 0) {
          return JSON.stringify({
            type: "drug_information",
            query: query,
            resultCount: 0,
            results: [],
            message: `No drug information found for "${query}". Try searching with the generic drug name or active ingredient.`
          }, null, 2);
        }

        const formattedResponse = {
          type: "drug_information",
          query: query,
          resultCount: response.results.length,
          results: response.results.map((result: any) => ({
            title: result.title || "Drug Information",
            url: result.url,
            content: result.content,
            source: "valyu/valyu-drug-labels",
            dataType: "drug label",
            length: result.length,
            relevance_score: result.relevance_score,
          })),
        };

        return JSON.stringify(formattedResponse, null, 2);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("401") || error.message.includes("unauthorized")) {
            return "🔐 Invalid Valyu API key. Please check your VALYU_API_KEY environment variable.";
          }
        }
        return `❌ Error searching drug information: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
      }
    },
  }),

  biomedicalLiteratureSearch: tool({
    description:
      "Search PubMed, ArXiv, and academic journals for scientific papers and biomedical research",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          'Biomedical literature search query (e.g., "CRISPR gene editing safety", "immunotherapy lung cancer", "COVID-19 long-term effects")'
        ),
      maxResults: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .default(10)
        .describe("Maximum number of results to return"),
      startDate: z
        .string()
        .optional()
        .describe('Start date filter in MM-DD-YYYY format'),
      endDate: z
        .string()
        .optional()
        .describe('End date filter in MM-DD-YYYY format'),
    }),
    execute: async ({ query, maxResults, startDate, endDate }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
      
      try {
        const apiKey = process.env.VALYU_API_KEY;
        if (!apiKey) {
          return "❌ Valyu API key not configured. Please add VALYU_API_KEY to your environment variables to enable biomedical literature search.";
        }
        const valyu = new Valyu(apiKey, "https://stage.api.valyu.network/v1");

        const includedSources = ['valyu/valyu-pubmed', 'valyu/valyu-arxiv', 'wiley/wiley-finance-papers', 'wiley/wiley-finance-books'];

        const searchOptions: any = {
          maxNumResults: maxResults || 10,
          includedSources: includedSources,
        };

        if (startDate) searchOptions.startDate = startDate;
        if (endDate) searchOptions.endDate = endDate;

        const response = await valyu.search(query, searchOptions);

        await track('Valyu API Call', {
          toolType: 'biomedicalLiteratureSearch',
          query: query,
          maxResults: maxResults || 10,
          resultCount: response?.results?.length || 0,
          hasApiKey: !!apiKey,
          sources: includedSources?.join(',') || 'all',
          cost: (response as any)?.total_deduction_dollars || null,
          txId: (response as any)?.tx_id || null
        });

        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            await polarTracker.trackValyuAPIUsage(
              userId,
              sessionId,
              'biomedicalLiteratureSearch',
              valyuCostDollars,
              {
                query,
                resultCount: response?.results?.length || 0,
                sources: includedSources?.join(',') || 'all',
                success: true,
                tx_id: (response as any)?.tx_id
              }
            );
          } catch (error) {
            console.error('[BiomedicalLiteratureSearch] Failed to track Valyu API usage:', error);
          }
        }

        if (!response || !response.results || response.results.length === 0) {
          return JSON.stringify({
            type: "biomedical_literature",
            query: query,
            resultCount: 0,
            results: [],
            message: `No biomedical literature found for "${query}". Try using different medical terminology or MeSH terms.`
          }, null, 2);
        }

        const formattedResponse = {
          type: "biomedical_literature",
          query: query,
          resultCount: response.results.length,
          results: response.results.map((result: any) => ({
            title: result.title || "Research Paper",
            url: result.url,
            content: result.content,
            date: result.metadata?.date,
            source: result.metadata?.source || result.source,
            dataType: "literature",
            length: result.length,
            image_url: result.image_url || {},
            relevance_score: result.relevance_score,
          })),
        };

        return JSON.stringify(formattedResponse, null, 2);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("401") || error.message.includes("unauthorized")) {
            return "🔐 Invalid Valyu API key. Please check your VALYU_API_KEY environment variable.";
          }
        }
        return `❌ Error searching biomedical literature: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
      }
    },
  }),

  pharmaCompanyAnalysis: tool({
    description:
      "Analyze pharmaceutical company through SEC filings, financial data, and news for competitive intelligence",
    inputSchema: z.object({
      company: z
        .string()
        .describe(
          'Pharmaceutical company name (e.g., "Pfizer", "Moderna", "Johnson & Johnson", "Merck")'
        ),
      dataTypes: z
        .array(z.enum(["sec_filings", "stock_price", "earnings", "news"]))
        .describe("Types of data to analyze"),
      timePeriod: z
        .string()
        .optional()
        .describe('Time period for analysis (e.g., "last 5 years", "during COVID", "2023")'),
      maxResults: z
        .number()
        .min(1)
        .max(30)
        .optional()
        .default(15)
        .describe("Maximum number of results to return"),
    }),
    execute: async ({ company, dataTypes, timePeriod, maxResults }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
      
      try {
        const apiKey = process.env.VALYU_API_KEY;
        if (!apiKey) {
          return "❌ Valyu API key not configured. Please add VALYU_API_KEY to your environment variables to enable pharma company analysis.";
        }
        const valyu = new Valyu(apiKey, "https://stage.api.valyu.network/v1");

        const sources: string[] = [];
        if (dataTypes.includes('sec_filings')) {
          sources.push('valyu/valyu-sec-filings');
        }
        if (dataTypes.includes('stock_price')) {
          sources.push('valyu/valyu-stocks-US');
        }
        if (dataTypes.includes('earnings')) {
          sources.push('valyu/valyu-earnings-US');
        }
        
        const query = `${company} ${timePeriod || ''}`.trim();
        
        let searchOptions: any = {
          maxNumResults: maxResults || 15,
          relevanceThreshold: 0.4,
          isToolCall: true,
        };

        if (sources.length > 0) {
          searchOptions.searchType = 'proprietary';
          searchOptions.includedSources = sources;
        } else if (dataTypes.includes('news')) {
          searchOptions.searchType = 'all'; // Search both proprietary and web
        }

        const response = await valyu.search(query, searchOptions);

        await track('Valyu API Call', {
          toolType: 'pharmaCompanyAnalysis',
          query: query,
          company: company,
          dataTypes: dataTypes.join(','),
          maxResults: maxResults || 15,
          resultCount: response?.results?.length || 0,
          hasApiKey: !!apiKey,
          cost: (response as any)?.total_deduction_dollars || null,
          txId: (response as any)?.tx_id || null
        });

        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            await polarTracker.trackValyuAPIUsage(
              userId,
              sessionId,
              'pharmaCompanyAnalysis',
              valyuCostDollars,
              {
                company,
                dataTypes: dataTypes.join(','),
                resultCount: response?.results?.length || 0,
                success: true,
                tx_id: (response as any)?.tx_id
              }
            );
          } catch (error) {
            console.error('[PharmaCompanyAnalysis] Failed to track Valyu API usage:', error);
          }
        }

        if (!response || !response.results || response.results.length === 0) {
          return JSON.stringify({
            type: "pharma_company_analysis",
            query: query,
            company: company,
            resultCount: 0,
            results: [],
            message: `No data found for "${company}". Ensure the company name is correct and try again.`
          }, null, 2);
        }

        const formattedResponse = {
          type: "pharma_company_analysis",
          company: company,
          timePeriod: timePeriod,
          resultCount: response.results.length,
          results: response.results.map((result: any) => ({
            title: result.title || "Company Data",
            url: result.url,
            content: result.content,
            date: result.metadata?.date,
            source: result.metadata?.source || result.source,
            dataType: result.data_type,
            length: result.length,
            image_url: result.image_url || {},
            relevance_score: result.relevance_score,
          })),
        };

        return JSON.stringify(formattedResponse, null, 2);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("401") || error.message.includes("unauthorized")) {
            return "🔐 Invalid Valyu API key. Please check your VALYU_API_KEY environment variable.";
          }
        }
        return `❌ Error analyzing pharma company: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
      }
    },
  }),

  comprehensiveHealthcareSearch: tool({
    description:
      "Search across all healthcare data sources including clinical trials, drug labels, PubMed, and pharma data",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          'Comprehensive healthcare search query (e.g., "CAR-T therapy latest advances", "diabetes treatment options", "mRNA vaccine development")'
        ),
      includeClinicalTrials: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include clinical trials data"),
      includeDrugLabels: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include FDA drug label data"),
      includeLiterature: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include PubMed and academic literature"),
      includeFinancial: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include pharma company financial data"),
      maxResults: z
        .number()
        .min(1)
        .max(30)
        .optional()
        .default(20)
        .describe("Maximum number of results to return"),
    }),
    execute: async ({ query, includeClinicalTrials, includeDrugLabels, includeLiterature, includeFinancial, maxResults }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
      
      try {
        const apiKey = process.env.VALYU_API_KEY;
        if (!apiKey) {
          return "❌ Valyu API key not configured. Please add VALYU_API_KEY to your environment variables to enable comprehensive healthcare search.";
        }
        const valyu = new Valyu(apiKey, "https://stage.api.valyu.network/v1");

        const sources: string[] = [];
        
        if (includeClinicalTrials) {
          sources.push('valyu/valyu-clinical-trials');
        }
        if (includeDrugLabels) {
          sources.push('valyu/valyu-drug-labels');
        }
        if (includeLiterature) {
          sources.push('valyu/valyu-pubmed', 'valyu/valyu-arxiv');
        }
        if (includeFinancial) {
          sources.push('valyu/valyu-sec-filings', 'valyu/valyu-stocks-US');
        }

        const searchOptions: any = {
          maxNumResults: maxResults || 20,
          searchType: sources.length > 0 ? 'proprietary' : 'all',
          relevanceThreshold: 0.4,
          isToolCall: true,
        };

        if (sources.length > 0) {
          searchOptions.includedSources = sources;
        }

        const response = await valyu.search(query, searchOptions);

        await track('Valyu API Call', {
          toolType: 'comprehensiveHealthcareSearch',
          query: query,
          maxResults: maxResults || 20,
          resultCount: response?.results?.length || 0,
          hasApiKey: !!apiKey,
          includedTypes: [
            includeClinicalTrials && 'trials',
            includeDrugLabels && 'drugs',
            includeLiterature && 'literature',
            includeFinancial && 'financial'
          ].filter(Boolean).join(','),
          cost: (response as any)?.total_deduction_dollars || null,
          txId: (response as any)?.tx_id || null
        });

        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            await polarTracker.trackValyuAPIUsage(
              userId,
              sessionId,
              'comprehensiveHealthcareSearch',
              valyuCostDollars,
              {
                query,
                resultCount: response?.results?.length || 0,
                includedTypes: sources.join(','),
                success: true,
                tx_id: (response as any)?.tx_id
              }
            );
          } catch (error) {
            console.error('[ComprehensiveHealthcareSearch] Failed to track Valyu API usage:', error);
          }
        }

        if (!response || !response.results || response.results.length === 0) {
          return JSON.stringify({
            type: "comprehensive_healthcare",
            query: query,
            resultCount: 0,
            results: [],
            message: `No healthcare data found for "${query}". Try using more specific medical terms or adjusting search parameters.`
          }, null, 2);
        }

        const formattedResponse = {
          type: "comprehensive_healthcare",
          query: query,
          resultCount: response.results.length,
          results: response.results.map((result: any) => ({
            title: result.title || "Healthcare Data",
            url: result.url,
            content: result.content,
            date: result.metadata?.date,
            source: result.metadata?.source || result.source,
            dataType: result.data_type || "healthcare",
            length: result.length,
            image_url: result.image_url || {},
            relevance_score: result.relevance_score,
          })),
        };

        return JSON.stringify(formattedResponse, null, 2);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("401") || error.message.includes("unauthorized")) {
            return "🔐 Invalid Valyu API key. Please check your VALYU_API_KEY environment variable.";
          }
        }
        return `❌ Error performing comprehensive healthcare search: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
      }
    },
  }),

  webSearch: tool({
    description:
      "Search the web for general information on any topic using Valyu DeepSearch API with access to both proprietary sources and web content",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          'Search query for any topic (e.g., "benefits of renewable energy", "latest AI developments", "climate change solutions")'
        ),
      maxResults: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .default(5)
        .describe("Maximum number of results to return"),
    }),
    execute: async ({ query, maxResults }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
      
      try {
        // Initialize Valyu client (uses default/free tier if no API key)
        const valyu = new Valyu(
          process.env.VALYU_API_KEY,
          "https://stage.api.valyu.network/v1"
        );

        // Configure search options
        const searchOptions = {
          searchType: "all" as const, // Search both proprietary and web sources
          maxNumResults: maxResults || 5,
          isToolCall: true, // true for AI agents/tools
        };

        const response = await valyu.search(query, searchOptions);

        // Track Valyu web search call
        await track('Valyu API Call', {
          toolType: 'webSearch',
          query: query,
          maxResults: maxResults || 5,
          resultCount: response?.results?.length || 0,
          hasApiKey: !!process.env.VALYU_API_KEY,
          cost: (response as any)?.metadata?.totalCost || (response as any)?.total_deduction_dollars || null,
          searchTime: (response as any)?.metadata?.searchTime || null,
          txId: (response as any)?.tx_id || null
        });

        // Track usage for pay-per-use customers with Polar events
        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            // Use the actual Valyu API cost from response
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            
            console.log('[WebSearch] Tracking Valyu API usage with Polar:', {
              userId,
              sessionId,
              valyuCostDollars,
              resultCount: response?.results?.length || 0
            });
            
            await polarTracker.trackValyuAPIUsage(
              userId,
              sessionId,
              'webSearch',
              valyuCostDollars,
              {
                query,
                resultCount: response?.results?.length || 0,
                success: true,
                tx_id: (response as any)?.tx_id,
                search_time: (response as any)?.metadata?.searchTime
              }
            );
          } catch (error) {
            console.error('[WebSearch] Failed to track Valyu API usage:', error);
            // Don't fail the search if usage tracking fails
          }
        }

        // Log the full API response for debugging
        console.log(
          "[Web Search] Full API Response:",
          JSON.stringify(response, null, 2)
        );

        if (!response || !response.results || response.results.length === 0) {
          return `🔍 No web results found for "${query}". Try rephrasing your search with different keywords.`;
        }

        // Log key information about the search
        const metadata = (response as any).metadata;
        console.log("[Web Search] Summary:", {
          query,
          resultCount: response.results.length,
          totalCost: metadata?.totalCost || (response as any).total_deduction_dollars || "N/A",
          searchTime: metadata?.searchTime || "N/A",
          txId: (response as any).tx_id || "N/A",
          firstResultTitle: response.results[0]?.title,
          firstResultLength: response.results[0]?.length,
        });

        // Return structured data for the model to process
        const formattedResponse = {
          type: "web_search",
          query: query,
          resultCount: response.results.length,
          metadata: {
            totalCost: metadata?.totalCost,
            searchTime: metadata?.searchTime,
          },
          results: response.results.map((result: any) => ({
            title: result.title || "Web Result",
            url: result.url,
            content: result.content,
            date: result.metadata?.date,
            source: result.metadata?.source,
            dataType: result.data_type,
            length: result.length,
            image_url: result.image_url || {},
            relevance_score: result.relevance_score,
          })),
        };

        console.log(
          "[Web Search] Formatted response size:",
          JSON.stringify(formattedResponse).length,
          "bytes"
        );

        return JSON.stringify(formattedResponse, null, 2);
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message.includes("401") ||
            error.message.includes("unauthorized")
          ) {
            return "🔐 Authentication error with Valyu API. Please check your configuration.";
          }
          if (error.message.includes("429")) {
            return "⏱️ Rate limit exceeded. Please try again in a moment.";
          }
          if (
            error.message.includes("network") ||
            error.message.includes("fetch")
          ) {
            return "🌐 Network error connecting to Valyu API. Please check your internet connection.";
          }
          if (
            error.message.includes("price") ||
            error.message.includes("cost")
          ) {
            return "💰 Search cost exceeded maximum budget. Try reducing maxPrice or using more specific queries.";
          }
        }

        return `❌ Error performing web search: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
      }
    },
  }),
};

// Export with both names for compatibility
export const financeTools = healthcareTools;
