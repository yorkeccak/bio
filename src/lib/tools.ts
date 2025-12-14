import { z } from "zod";
import { tool } from "ai";
import { Valyu } from "valyu-js";
import { track } from "@vercel/analytics/server";
import { PolarEventTracker } from '@/lib/polar-events';
import { Sandbox } from '@e2b/code-interpreter';
import { createClient } from '@/utils/supabase/server';
import * as db from '@/lib/db';
import { randomUUID } from 'crypto';

// E2B Session Manager - Maintains persistent sandboxes per chat session
interface SandboxSession {
  sandbox: Sandbox;
  lastUsed: Date;
  createdAt: Date;
}

// Track notebook cell state per session
interface NotebookSessionState {
  cellCount: number;
  executionOrder: number;
}

const sandboxSessions = new Map<string, SandboxSession>();
const notebookSessions = new Map<string, NotebookSessionState>();

function getNotebookState(sessionId: string): NotebookSessionState {
  if (!notebookSessions.has(sessionId)) {
    notebookSessions.set(sessionId, { cellCount: 0, executionOrder: 0 });
  }
  return notebookSessions.get(sessionId)!;
}

// Cleanup idle sandboxes (older than 30 minutes)
const SANDBOX_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

async function cleanupIdleSandboxes() {
  const now = Date.now();
  const sessionsToCleanup: string[] = [];

  for (const [sessionId, session] of sandboxSessions.entries()) {
    if (now - session.lastUsed.getTime() > SANDBOX_IDLE_TIMEOUT_MS) {
      sessionsToCleanup.push(sessionId);
    }
  }

  for (const sessionId of sessionsToCleanup) {
    try {
      const session = sandboxSessions.get(sessionId);
      if (session) {
        await session.sandbox.kill();
        sandboxSessions.delete(sessionId);
        console.log(`[E2B] Cleaned up idle sandbox for session: ${sessionId}`);
      }
    } catch (error) {
      console.error(`[E2B] Error cleaning up sandbox for session ${sessionId}:`, error);
      sandboxSessions.delete(sessionId);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupIdleSandboxes, 5 * 60 * 1000);

// Get or create sandbox for a session
async function getOrCreateSandbox(sessionId: string): Promise<Sandbox> {
  const existingSession = sandboxSessions.get(sessionId);

  if (existingSession) {
    // Update last used timestamp
    existingSession.lastUsed = new Date();
    return existingSession.sandbox;
  }

  // Create new sandbox
  const sandbox = await Sandbox.create({
    apiKey: process.env.E2B_API_KEY,
  });

  sandboxSessions.set(sessionId, {
    sandbox,
    lastUsed: new Date(),
    createdAt: new Date(),
  });

  console.log(`[E2B] Created new sandbox for session: ${sessionId}`);
  return sandbox;
}

export const healthcareTools = {
  // Chart Creation Tool - Create interactive charts for biomedical data visualization
  createChart: tool({
    description: `Create interactive charts for biomedical and clinical data visualization.

    CHART TYPES:
    1. "line" - Time series trends (patient outcomes over time, survival curves, biomarker levels)
    2. "bar" - Categorical comparisons (treatment group outcomes, drug efficacy comparison)
    3. "area" - Cumulative data (stacked metrics, composition over time)
    4. "scatter" - Correlation analysis, drug positioning maps, patient stratification
    5. "quadrant" - 2x2 clinical matrices (risk stratification, drug selection matrices)

    TIME SERIES CHARTS (line, bar, area):
    {
      "title": "Pembrolizumab vs Nivolumab Response Rates",
      "type": "line",
      "xAxisLabel": "Weeks Since Treatment Initiation",
      "yAxisLabel": "Overall Response Rate (%)",
      "dataSeries": [
        {
          "name": "Pembrolizumab",
          "data": [
            {"x": "Week 0", "y": 0},
            {"x": "Week 4", "y": 32.5},
            {"x": "Week 12", "y": 45.0}
          ]
        },
        {
          "name": "Nivolumab",
          "data": [
            {"x": "Week 0", "y": 0},
            {"x": "Week 4", "y": 28.0},
            {"x": "Week 12", "y": 40.0}
          ]
        }
      ]
    }

    SCATTER/BUBBLE CHARTS (for positioning, correlation):
    Each SERIES represents a CATEGORY (for color coding).
    Each DATA POINT represents an individual entity with x, y, size, and label.
    {
      "title": "Drug Candidates: Efficacy vs Safety Profile",
      "type": "scatter",
      "xAxisLabel": "Overall Response Rate (%)",
      "yAxisLabel": "Grade 3+ Adverse Events (%)",
      "dataSeries": [
        {
          "name": "Checkpoint Inhibitors",
          "data": [
            {"x": 45.0, "y": 27.3, "size": 5000, "label": "Pembrolizumab"},
            {"x": 40.0, "y": 25.1, "size": 4500, "label": "Nivolumab"}
          ]
        },
        {
          "name": "Chemotherapy",
          "data": [
            {"x": 35.0, "y": 65.0, "size": 3000, "label": "Carboplatin"}
          ]
        }
      ]
    }

    QUADRANT CHARTS (2x2 clinical matrix):
    Same as scatter, but with reference lines dividing chart into 4 quadrants.
    Use for: Risk stratification, treatment selection, drug prioritization.

    CRITICAL: ALL REQUIRED FIELDS MUST BE PROVIDED.`,
    inputSchema: z.object({
      title: z
        .string()
        .describe('Chart title (e.g., "Pembrolizumab vs Nivolumab Response Rates")'),
      type: z
        .enum(["line", "bar", "area", "scatter", "quadrant"])
        .describe(
          'Chart type: "line" (time series), "bar" (comparisons), "area" (cumulative), "scatter" (positioning/correlation), "quadrant" (2x2 matrix)'
        ),
      xAxisLabel: z
        .string()
        .describe('X-axis label (e.g., "Weeks", "Response Rate (%)", "Risk Score (1-10)")'),
      yAxisLabel: z
        .string()
        .describe(
          'Y-axis label (e.g., "Survival Probability", "Adverse Events (%)", "Efficacy Score (1-10)")'
        ),
      dataSeries: z
        .array(
          z.object({
            name: z
              .string()
              .describe(
                'Series name - For time series: drug/treatment name. For scatter/quadrant: category name for color coding (e.g., "Checkpoint Inhibitors", "Chemotherapy")'
              ),
            data: z
              .array(
                z.object({
                  x: z
                    .union([z.string(), z.number()])
                    .describe(
                      'X-axis value - Date/time string for time series, numeric value for scatter/quadrant'
                    ),
                  y: z
                    .number()
                    .describe(
                      "Y-axis numeric value - response rate, survival %, score, etc. REQUIRED for all chart types."
                    ),
                  size: z
                    .number()
                    .optional()
                    .describe(
                      'Bubble size for scatter/quadrant charts (e.g., patient count, trial size, market size). Larger = bigger bubble.'
                    ),
                  label: z
                    .string()
                    .optional()
                    .describe(
                      'Individual entity name for scatter/quadrant charts (e.g., "Pembrolizumab", "Patient Cohort A"). Displayed on/near bubble.'
                    ),
                })
              )
              .describe(
                "Array of data points. For time series: {x: date, y: value}. For scatter/quadrant: {x, y, size, label}."
              ),
          })
        )
        .describe(
          "REQUIRED: Array of data series. For scatter/quadrant: each series = category for color coding, each point = individual entity"
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
    }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;

      // Calculate metadata based on chart type
      let dateRange = null;
      if (type === 'scatter' || type === 'quadrant') {
        // For scatter/quadrant charts, show x and y axis ranges
        const allXValues = dataSeries.flatMap(s => s.data.map(d => Number(d.x)));
        const allYValues = dataSeries.flatMap(s => s.data.map(d => d.y ?? 0));
        if (allXValues.length > 0 && allYValues.length > 0) {
          dateRange = {
            start: `X: ${Math.min(...allXValues).toFixed(1)}-${Math.max(...allXValues).toFixed(1)}`,
            end: `Y: ${Math.min(...allYValues).toFixed(1)}-${Math.max(...allYValues).toFixed(1)}`,
          };
        }
      } else {
        // For time series charts, show date/label range
        if (dataSeries.length > 0 && dataSeries[0].data.length > 0) {
          dateRange = {
            start: dataSeries[0].data[0].x,
            end: dataSeries[0].data[dataSeries[0].data.length - 1].x,
          };
        }
      }

      await track('Chart Created', {
        chartType: type,
        title: title,
        seriesCount: dataSeries.length,
        totalDataPoints: dataSeries.reduce((sum, series) => sum + series.data.length, 0),
        hasDescription: !!description,
        hasScatterData: dataSeries.some(s => s.data.some(d => d.size || d.label)),
      });

      const chartData = {
        chartType: type,
        title,
        xAxisLabel,
        yAxisLabel,
        dataSeries,
        description,
        metadata: {
          totalSeries: dataSeries.length,
          totalDataPoints: dataSeries.reduce((sum, series) => sum + series.data.length, 0),
          dateRange,
        },
      };

      // Save chart to database
      let chartId: string | null = null;
      try {
        chartId = randomUUID();
        const insertData: any = {
          id: chartId,
          session_id: sessionId || null,
          chart_data: chartData,
        };

        if (userId) {
          insertData.user_id = userId;
        } else {
          insertData.anonymous_id = 'anonymous';
        }

        await db.createChart(insertData);
      } catch (error) {
        console.error('[createChart] Error saving chart:', error);
        chartId = null;
      }

      return {
        ...chartData,
        chartId: chartId || undefined,
        imageUrl: chartId ? `/api/charts/${chartId}/image` : undefined,
      };
    },
  }),

  // CSV Creation Tool - Generate downloadable CSV files for biomedical data
  createCSV: tool({
    description: `Create downloadable CSV files for biomedical data, research tables, and analysis results.

    USE CASES:
    - Export clinical trial results (patient demographics, outcomes, adverse events)
    - Create comparison tables (drug efficacy, treatment protocols, biomarkers)
    - Generate time series data exports (lab values over time, vital signs)
    - Build data tables for further analysis (gene expression, protein levels)
    - Create custom research reports (literature review summaries, study comparisons)

    REFERENCING CSVs IN MARKDOWN:
    After creating a CSV, you MUST reference it in your markdown response to display it as an inline table.

    CRITICAL - Use this EXACT format:
    ![csv](csv:csvId)

    Where csvId is the ID returned in the tool response.

    Example:
    - Tool returns: { csvId: "abc-123-def-456", ... }
    - In your response: "Here is the data:\n\n![csv](csv:abc-123-def-456)\n\n"

    The CSV will automatically render as a formatted markdown table. Do NOT use link syntax [text](csv:id), ONLY use image syntax ![csv](csv:id).

    IMPORTANT GUIDELINES:
    - Use descriptive column headers
    - Include units in headers when applicable (e.g., "Concentration (mg/L)", "Response Rate (%)")
    - Format numbers appropriately (use consistent decimal places)
    - Add a title/description to explain the data
    - Organize data logically (chronological, by treatment group, or by significance)

    EXAMPLE - Drug Comparison:
    {
      "title": "Immunotherapy Drugs - Efficacy Comparison in NSCLC",
      "description": "Key clinical outcomes for checkpoint inhibitors in non-small cell lung cancer",
      "headers": ["Drug", "ORR (%)", "mPFS (months)", "mOS (months)", "Grade 3+ AE (%)", "FDA Approval"],
      "rows": [
        ["Pembrolizumab", "45.0", "10.3", "30.0", "27.3", "2016"],
        ["Nivolumab", "40.0", "9.2", "28.0", "25.1", "2015"],
        ["Atezolizumab", "38.0", "8.8", "26.5", "22.5", "2016"]
      ]
    }

    EXAMPLE - Clinical Trial Results:
    {
      "title": "Phase 3 Trial - Patient Demographics",
      "description": "Baseline characteristics of enrolled patients (N=450)",
      "headers": ["Characteristic", "Treatment Arm (n=225)", "Control Arm (n=225)", "p-value"],
      "rows": [
        ["Age, mean (SD)", "62.5 (8.3)", "61.8 (9.1)", "0.45"],
        ["Male, n (%)", "135 (60%)", "142 (63%)", "0.52"],
        ["Stage IV, n (%)", "180 (80%)", "175 (78%)", "0.61"]
      ]
    }

    EXAMPLE - Lab Values Over Time:
    {
      "title": "Patient 001 - Complete Blood Count Trends",
      "description": "CBC values during treatment (baseline to week 12)",
      "headers": ["Week", "WBC (K/uL)", "RBC (M/uL)", "Hemoglobin (g/dL)", "Platelets (K/uL)"],
      "rows": [
        ["Baseline", "7.2", "4.5", "13.8", "245"],
        ["Week 4", "6.8", "4.3", "13.2", "230"],
        ["Week 8", "7.0", "4.4", "13.5", "238"],
        ["Week 12", "7.3", "4.6", "14.0", "250"]
      ]
    }

    The CSV will be rendered as an interactive table with download capability.`,
    inputSchema: z.object({
      title: z.string().describe("Title for the CSV file (will be used as filename)"),
      description: z.string().optional().describe("Optional description of the data"),
      headers: z.array(z.string()).describe("Column headers for the CSV"),
      rows: z.array(z.array(z.string())).describe("Data rows - each row is an array matching the headers"),
    }),
    execute: async ({ title, description, headers, rows }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;

      try {
        // Validate that all rows have the same number of columns as headers
        const headerCount = headers.length;
        const invalidRows = rows.filter(row => row.length !== headerCount);

        if (invalidRows.length > 0) {
          return {
            error: true,
            message: `❌ **CSV Validation Error**: All rows must have ${headerCount} columns to match headers. Found ${invalidRows.length} invalid row(s). Please regenerate the CSV with matching column counts.`,
            title,
            headers,
            expectedColumns: headerCount,
            invalidRowCount: invalidRows.length,
          };
        }

        // Generate CSV content
        const csvContent = [
          headers.join(','),
          ...rows.map(row =>
            row.map(cell => {
              // Escape cells that contain commas, quotes, or newlines
              if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                return `"${cell.replace(/"/g, '""')}"`;
              }
              return cell;
            }).join(',')
          )
        ].join('\n');

        // Save CSV to database
        let csvId: string | null = null;
        try {
          csvId = randomUUID();

          const insertData: any = {
            id: csvId,
            session_id: sessionId || null,
            title,
            description: description || undefined,
            headers,
            rows: rows,
          };

          if (userId) {
            insertData.user_id = userId;
          } else {
            insertData.anonymous_id = 'anonymous';
          }

          await db.createCSV(insertData);
        } catch (error) {
          console.error('[createCSV] Error saving CSV:', error);
          csvId = null;
        }

        // Track CSV creation
        await track('CSV Created', {
          title: title,
          rowCount: rows.length,
          columnCount: headers.length,
          hasDescription: !!description,
          savedToDb: !!csvId,
        });

        const result = {
          title,
          description,
          headers,
          rows,
          csvContent,
          rowCount: rows.length,
          columnCount: headers.length,
          csvId: csvId || undefined,
          csvUrl: csvId ? `/api/csvs/${csvId}` : undefined,
          _instructions: csvId
            ? `IMPORTANT: Include this EXACT line in your markdown response to display the table:\n\n![csv](csv:${csvId})\n\nDo not write [View Table] or any other text - use the image syntax above.`
            : undefined,
        };

        return result;
      } catch (error: any) {
        return {
          error: true,
          message: `❌ **CSV Creation Error**: ${error.message || 'Unknown error occurred'}`,
          title,
        };
      }
    },
  }),

  codeExecution: tool({
    description: `Execute Python code in a Jupyter notebook cell for biomedical data analysis, statistical calculations, and pharmacokinetic modeling.

    CRITICAL: Always include print() statements to show results. Maximum 10,000 characters.

    SESSION PERSISTENCE: Variables and installed packages persist across multiple code executions within the same chat session. Each execution is tracked as a notebook cell.

    NOTEBOOK FEATURES:
    - All code executions are saved as notebook cells
    - Rich outputs supported (matplotlib plots, HTML, images)
    - Downloadable .ipynb file available
    - Auto-retry on errors (up to 3 attempts)

    PRE-INSTALLED LIBRARIES: numpy, pandas, scipy, matplotlib, seaborn, scikit-learn, biopython, rdkit, and more.

    Example for biomedical calculations:
    # Calculate drug half-life
    import math
    initial_concentration = 100  # mg/L
    final_concentration = 50     # mg/L
    time_elapsed = 4             # hours
    half_life = time_elapsed * (math.log(2) / math.log(initial_concentration / final_concentration))
    print(f"Calculated half-life: {half_life:.2f} hours")`,
    inputSchema: z.object({
      code: z.string().describe('Python code to execute - MUST include print() statements'),
      description: z.string().optional().describe('Brief description of the calculation'),
    }),
    execute: async ({ code, description }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

      const MAX_RETRIES = 3;
      const startTime = Date.now();

      try {
        if (code.length > 10000) {
          return {
            success: false,
            error: { message: 'Code too long. Please limit your code to 10,000 characters.' },
            code,
          };
        }

        const e2bApiKey = process.env.E2B_API_KEY;
        if (!e2bApiKey) {
          return {
            success: false,
            error: { message: 'E2B API key is not configured.' },
            code,
          };
        }

        // Use session ID for persistent sandbox, or generate a temporary one
        const sandboxSessionId = sessionId || `temp-${randomUUID()}`;
        const isNewSession = !sandboxSessions.has(sandboxSessionId);
        const notebookState = getNotebookState(sandboxSessionId);
        const cellId = `cell-${sandboxSessionId}-${notebookState.cellCount}`;

        let retryCount = 0;
        let lastError: any = null;
        let success = false;
        let finalResult: any = null;

        try {
          const sandbox = await getOrCreateSandbox(sandboxSessionId);

          // Retry loop for auto-healing
          while (retryCount <= MAX_RETRIES) {
            const cellStartTime = Date.now();

            try {
              // Use runCode for code execution (E2B's Jupyter-based execution)
              const cellResult = await sandbox.runCode(code);
              const executionTime = Date.now() - cellStartTime;

              const outputs: any[] = [];

              // Process stdout
              if (cellResult.logs?.stdout && cellResult.logs.stdout.length > 0) {
                outputs.push({ type: 'stdout', text: cellResult.logs.stdout.join('\n') });
              }

              // Process stderr (warnings)
              if (cellResult.logs?.stderr && cellResult.logs.stderr.length > 0) {
                outputs.push({ type: 'stderr', text: cellResult.logs.stderr.join('\n') });
              }

              // Process rich outputs (images, HTML, etc.) from results
              if (cellResult.results && cellResult.results.length > 0) {
                for (const result of cellResult.results) {
                  // Each result can have different properties based on type
                  const resultAny = result as any;
                  if (resultAny.png) {
                    outputs.push({ type: 'image', format: 'png', data: resultAny.png });
                  }
                  if (resultAny.html) {
                    outputs.push({ type: 'html', data: resultAny.html });
                  }
                  if (resultAny.text) {
                    outputs.push({ type: 'text', text: resultAny.text });
                  }
                  if (resultAny.jpeg) {
                    outputs.push({ type: 'image', format: 'jpeg', data: resultAny.jpeg });
                  }
                  if (resultAny.svg) {
                    outputs.push({ type: 'svg', data: resultAny.svg });
                  }
                }
              }

              // Check for errors
              if (cellResult.error) {
                const errorAny = cellResult.error as any;
                lastError = {
                  name: errorAny.name || 'Error',
                  message: errorAny.value || errorAny.message || 'Unknown error',
                  traceback: errorAny.traceback || [],
                };

                // If we still have retries left, continue
                if (retryCount < MAX_RETRIES) {
                  retryCount++;
                  console.log(`[E2B Notebook] Retry ${retryCount}/${MAX_RETRIES} for cell execution`);
                  continue;
                }

                // No more retries - save failed cell and return error
                success = false;
                notebookState.cellCount++;

                // Save failed cell to database
                try {
                  await db.createNotebookCell({
                    id: cellId,
                    session_id: sessionId || sandboxSessionId,
                    user_id: userId,
                    cell_index: notebookState.cellCount - 1,
                    cell_type: 'code',
                    source: code,
                    outputs,
                    execution_count: undefined,
                    execution_time_ms: executionTime,
                    success: false,
                    error_message: lastError.message,
                    retry_count: retryCount,
                    metadata: { description },
                  });
                } catch (dbError) {
                  console.error('[E2B Notebook] Failed to save failed cell:', dbError);
                }

                finalResult = {
                  cellId,
                  cellIndex: notebookState.cellCount - 1,
                  code,
                  outputs,
                  executionTimeMs: executionTime,
                  success: false,
                  error: lastError,
                  retryCount,
                  description,
                  isNewSession,
                };
                break;
              }

              // Success!
              success = true;
              notebookState.cellCount++;
              notebookState.executionOrder++;

              // Save successful cell to database
              try {
                await db.createNotebookCell({
                  id: cellId,
                  session_id: sessionId || sandboxSessionId,
                  user_id: userId,
                  cell_index: notebookState.cellCount - 1,
                  cell_type: 'code',
                  source: code,
                  outputs,
                  execution_count: notebookState.executionOrder,
                  execution_time_ms: executionTime,
                  success: true,
                  retry_count: retryCount,
                  metadata: { description },
                });
              } catch (dbError) {
                console.error('[E2B Notebook] Failed to save cell:', dbError);
              }

              // Track analytics
              await track('Python Code Executed', {
                success: true,
                codeLength: code.length,
                executionTime: executionTime,
                hasDescription: !!description,
                isNewSession: isNewSession,
                cellIndex: notebookState.cellCount - 1,
                retryCount,
              });

              // Track usage for pay-per-use users
              if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
                try {
                  const polarTracker = new PolarEventTracker();
                  await polarTracker.trackE2BUsage(userId, sessionId, executionTime, {
                    codeLength: code.length,
                    success: true,
                    description: description || 'Code execution',
                    cellIndex: notebookState.cellCount - 1,
                  });
                } catch (error) {
                  console.error('[CodeExecution] Failed to track usage:', error);
                }
              }

              finalResult = {
                cellId,
                cellIndex: notebookState.cellCount - 1,
                executionOrder: notebookState.executionOrder,
                code,
                outputs,
                executionTimeMs: executionTime,
                success: true,
                retryCount,
                description,
                isNewSession,
              };
              break;

            } catch (execError: any) {
              lastError = {
                name: 'ExecutionError',
                message: execError.message || 'Unknown execution error',
                traceback: [],
              };

              if (retryCount < MAX_RETRIES) {
                retryCount++;
                continue;
              }

              // No more retries
              finalResult = {
                cellId,
                cellIndex: notebookState.cellCount,
                code,
                outputs: [],
                executionTimeMs: Date.now() - cellStartTime,
                success: false,
                error: lastError,
                retryCount,
                description,
                isNewSession,
              };
              break;
            }
          }

          return finalResult;

        } catch (sandboxError: any) {
          // If sandbox creation/execution fails, try to clean up
          if (sandboxSessionId && sandboxSessions.has(sandboxSessionId)) {
            try {
              const session = sandboxSessions.get(sandboxSessionId);
              if (session) {
                await session.sandbox.kill();
              }
            } catch (cleanupError) {
              console.error('[E2B] Cleanup error after failure:', cleanupError);
            }
            sandboxSessions.delete(sandboxSessionId);
            notebookSessions.delete(sandboxSessionId);
          }
          throw sandboxError;
        }
      } catch (error: any) {
        return {
          success: false,
          error: { message: error.message || 'Unknown error occurred' },
          code,
        };
      }
    },
  }),

  clinicalTrialsSearch: tool({
    description: "Search for clinical trials based on conditions, drugs, or research criteria using ClinicalTrials.gov data",
    inputSchema: z.object({
      query: z.string().describe('Clinical trials search query (e.g., "Phase 3 melanoma immunotherapy")'),
      maxResults: z.number().min(1).max(20).optional().default(10).describe('Maximum number of results'),
    }),
    execute: async ({ query, maxResults }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

      try {
        const apiKey = process.env.VALYU_API_KEY;
        if (!apiKey) {
          return "❌ Valyu API key not configured.";
        }
        const valyu = new Valyu(apiKey, "https://api.valyu.network/v1");

        const response = await valyu.search(query, {
          maxNumResults: 6,
          searchType: "proprietary",
          includedSources: ["valyu/valyu-clinical-trials"],
          relevanceThreshold: 0.4,
          isToolCall: true,
        });

        await track("Valyu API Call", {
          toolType: "clinicalTrialsSearch",
          query: query,
          resultCount: response?.results?.length || 0,
        });

        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            await polarTracker.trackValyuAPIUsage(userId, sessionId, "clinicalTrialsSearch", valyuCostDollars, {
              query,
              resultCount: response?.results?.length || 0,
              success: true,
            });
          } catch (error) {
            console.error('[ClinicalTrialsSearch] Failed to track usage:', error);
          }
        }

        return JSON.stringify({
          type: "clinical_trials",
          query: query,
          resultCount: response?.results?.length || 0,
          results: response?.results || [],
          favicon: 'https://clinicaltrials.gov/favicon.ico',
          displaySource: 'ClinicalTrials.gov'
        }, null, 2);
      } catch (error) {
        return `❌ Error searching clinical trials: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  }),

  drugInformationSearch: tool({
    description: "Search FDA drug labels for medication information, warnings, contraindications using DailyMed data",
    inputSchema: z.object({
      query: z.string().describe('Drug information search query (e.g., "warfarin contraindications")'),
      maxResults: z.number().min(1).max(10).optional().default(5).describe('Maximum number of results'),
    }),
    execute: async ({ query, maxResults }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

      try {
        const apiKey = process.env.VALYU_API_KEY;
        if (!apiKey) {
          return "❌ Valyu API key not configured.";
        }
        const valyu = new Valyu(apiKey, "https://api.valyu.network/v1");

        const response = await valyu.search(query, {
          maxNumResults: maxResults || 5,
          searchType: "proprietary",
          includedSources: ["valyu/valyu-drug-labels"],
          relevanceThreshold: 0.5,
          isToolCall: true,
        });

        await track("Valyu API Call", {
          toolType: "drugInformationSearch",
          query: query,
          resultCount: response?.results?.length || 0,
        });

        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            await polarTracker.trackValyuAPIUsage(userId, sessionId, "drugInformationSearch", valyuCostDollars, {
              query,
              resultCount: response?.results?.length || 0,
              success: true,
            });
          } catch (error) {
            console.error('[DrugInformationSearch] Failed to track usage:', error);
          }
        }

        return JSON.stringify({
          type: "drug_information",
          query: query,
          resultCount: response?.results?.length || 0,
          results: response?.results || [],
          favicon: 'https://dailymed.nlm.nih.gov/dailymed/image/NLM-logo.png',
          displaySource: 'DailyMed (NIH)'
        }, null, 2);
      } catch (error) {
        return `❌ Error searching drug information: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  }),

  biomedicalLiteratureSearch: tool({
    description: "Search PubMed, ArXiv, and academic journals for scientific papers and biomedical research",
    inputSchema: z.object({
      query: z.string().describe('Biomedical literature search query (e.g., "CRISPR gene editing safety")'),
      maxResults: z.number().min(1).max(20).optional().default(10).describe('Maximum number of results'),
    }),
    execute: async ({ query, maxResults }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

      try {
        const apiKey = process.env.VALYU_API_KEY;
        if (!apiKey) {
          return "❌ Valyu API key not configured.";
        }
        const valyu = new Valyu(apiKey, "https://api.valyu.network/v1");

        const response = await valyu.search(query, {
          maxNumResults: maxResults || 10,
          searchType: "proprietary",
          includedSources: ["valyu/valyu-pubmed", "valyu/valyu-arxiv", "valyu/valyu-medrxiv", "valyu/valyu-biorxiv"],
          isToolCall: true,
        });

        await track("Valyu API Call", {
          toolType: "biomedicalLiteratureSearch",
          query: query,
          resultCount: response?.results?.length || 0,
        });

        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            await polarTracker.trackValyuAPIUsage(userId, sessionId, "biomedicalLiteratureSearch", valyuCostDollars, {
              query,
              resultCount: response?.results?.length || 0,
              success: true,
            });
          } catch (error) {
            console.error('[BiomedicalLiteratureSearch] Failed to track usage:', error);
          }
        }

        return JSON.stringify({
          type: "biomedical_literature",
          query: query,
          resultCount: response?.results?.length || 0,
          results: response?.results || [],
        }, null, 2);
      } catch (error) {
        return `❌ Error searching biomedical literature: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  }),

  webSearch: tool({
    description: "Search the web for general information on any topic",
    inputSchema: z.object({
      query: z.string().describe('Search query for any topic'),
      maxResults: z.number().min(1).max(20).optional().default(5).describe('Maximum number of results'),
    }),
    execute: async ({ query, maxResults }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

      try {
        const valyu = new Valyu(process.env.VALYU_API_KEY, "https://api.valyu.network/v1");

        const response = await valyu.search(query, {
          searchType: "all" as const,
          maxNumResults: maxResults || 5,
          isToolCall: true,
        });

        await track("Valyu API Call", {
          toolType: "webSearch",
          query: query,
          resultCount: response?.results?.length || 0,
        });

        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            await polarTracker.trackValyuAPIUsage(userId, sessionId, "webSearch", valyuCostDollars, {
              query,
              resultCount: response?.results?.length || 0,
              success: true,
            });
          } catch (error) {
            console.error('[WebSearch] Failed to track usage:', error);
          }
        }

        return JSON.stringify({
          type: "web_search",
          query: query,
          resultCount: response?.results?.length || 0,
          results: response?.results || [],
        }, null, 2);
      } catch (error) {
        return `❌ Error performing web search: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  }),

  proteinViewer: tool({
    description: `Visualize 3D protein structures interactively in the chat.

    USE CASES:
    - Display protein structures by name (e.g., "hemoglobin", "insulin", "spike protein")
    - Visualize enzyme active sites and binding pockets
    - Show protein-ligand complexes
    - Explore protein structures from scientific research

    INPUT: Protein common name or 4-character PDB ID
    - Protein names: "hemoglobin", "insulin", "SARS-CoV-2 spike protein"
    - PDB IDs: "1cbs", "4hhb", "6lu7"

    The tool searches the RCSB Protein Data Bank and displays the best matching structure
    in an interactive 3D viewer where users can rotate, zoom, and explore the protein.`,
    inputSchema: z.object({
      query: z.string().describe('Protein name or 4-character PDB ID (e.g., "hemoglobin", "1cbs", "insulin")'),
      maxResults: z.number().min(1).max(5).optional().default(1).describe('Number of structure matches to consider (default: 1)'),
    }),
    execute: async ({ query, maxResults }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;

      try {
        const trimmedQuery = query.trim();

        // Detect if query is a 4-character PDB ID (starts with digit, 3 alphanumeric chars)
        const isPdbId = /^[0-9][a-z0-9]{3}$/i.test(trimmedQuery);

        let pdbId: string;
        let searchScore: number | undefined;
        let totalMatches: number | undefined;

        if (isPdbId) {
          // Direct PDB ID - validate format and use it
          pdbId = trimmedQuery.toLowerCase();
          searchScore = 1.0;
          totalMatches = 1;
        } else {
          // Protein name - search RCSB PDB API
          const RCSB_SEARCH_API = 'https://search.rcsb.org/rcsbsearch/v2/query';

          const searchQuery = {
            return_type: "entry",
            query: {
              type: "terminal",
              service: "full_text",
              parameters: {
                value: trimmedQuery
              }
            },
            request_options: {
              paginate: {
                start: 0,
                rows: maxResults || 1
              },
              sort: [{
                sort_by: "score",
                direction: "desc"
              }]
            }
          };

          const response = await fetch(RCSB_SEARCH_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchQuery),
            signal: AbortSignal.timeout(10000)
          });

          if (!response.ok) {
            return {
              error: true,
              message: `❌ Failed to search protein database: ${response.statusText}. Please try again or search at https://www.rcsb.org`
            };
          }

          const data = await response.json();

          if (!data.result_set || data.result_set.length === 0) {
            return {
              error: true,
              message: `❌ No protein structures found for "${trimmedQuery}". Try:\n- A different protein name\n- A 4-character PDB ID (e.g., "1cbs")\n- Searching at https://www.rcsb.org`
            };
          }

          // Use the top result (highest relevance score)
          pdbId = data.result_set[0].identifier.toLowerCase();
          searchScore = data.result_set[0].score;
          totalMatches = data.total_count;
        }

        // Save to database
        const structureId = randomUUID();
        try {
          const insertData: any = {
            id: structureId,
            session_id: sessionId || null,
            pdb_id: pdbId,
            protein_name: trimmedQuery,
            search_score: searchScore,
            metadata: {
              source: 'RCSB PDB',
              moleculeType: 'protein',
              wasDirectPdbId: isPdbId,
            },
          };

          if (userId) {
            insertData.user_id = userId;
          } else {
            insertData.anonymous_id = 'anonymous';
          }

          await db.createProteinStructure(insertData);
        } catch (error) {
          console.error('[proteinViewer] Error saving structure:', error);
        }

        // Track analytics
        await track('Protein Viewer Created', {
          query: trimmedQuery,
          pdbId: pdbId,
          wasDirectPdbId: isPdbId,
          searchResultCount: totalMatches || 1,
          searchScore: searchScore,
        });

        return {
          pdbId,
          proteinName: trimmedQuery,
          searchScore,
          structureId,
          totalMatches,
          rcsb_url: `https://www.rcsb.org/structure/${pdbId.toUpperCase()}`,
          pdbe_url: `https://www.ebi.ac.uk/pdbe/entry/pdb/${pdbId.toLowerCase()}`,
        };

      } catch (error: any) {
        console.error('[proteinViewer] Error:', error);
        return {
          error: true,
          message: `❌ Error loading protein structure: ${error.message || 'Unknown error occurred'}. Please try again.`
        };
      }
    },
  }),
};

// Export with both names for compatibility
export const biomedicalTools = healthcareTools;
