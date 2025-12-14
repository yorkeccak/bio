import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';

// Jupyter notebook format types
interface JupyterNotebook {
  nbformat: number;
  nbformat_minor: number;
  metadata: {
    kernelspec: {
      display_name: string;
      language: string;
      name: string;
    };
    language_info: {
      name: string;
      version: string;
      mimetype: string;
      file_extension: string;
    };
  };
  cells: JupyterCell[];
}

interface JupyterCell {
  cell_type: 'code' | 'markdown' | 'raw';
  execution_count: number | null;
  metadata: Record<string, any>;
  source: string[];
  outputs?: JupyterOutput[];
}

interface JupyterOutput {
  output_type: 'stream' | 'execute_result' | 'display_data' | 'error';
  name?: string;
  text?: string[];
  data?: Record<string, any>;
  execution_count?: number | null;
  ename?: string;
  evalue?: string;
  traceback?: string[];
  metadata?: Record<string, any>;
}

function convertOutputToJupyter(output: any): JupyterOutput | null {
  if (!output) return null;

  // Handle error output
  if (output.error) {
    return {
      output_type: 'error',
      ename: output.error.name || 'Error',
      evalue: output.error.message || '',
      traceback: output.error.traceback || [],
    };
  }

  // Handle stdout stream
  if (output.type === 'stdout' && output.text) {
    return {
      output_type: 'stream',
      name: 'stdout',
      text: output.text.split('\n').map((line: string) => line + '\n'),
    };
  }

  // Handle stderr stream
  if (output.type === 'stderr' && output.text) {
    return {
      output_type: 'stream',
      name: 'stderr',
      text: output.text.split('\n').map((line: string) => line + '\n'),
    };
  }

  // Handle text output
  if (output.type === 'text' && output.text) {
    return {
      output_type: 'execute_result',
      execution_count: null,
      data: {
        'text/plain': output.text.split('\n'),
      },
      metadata: {},
    };
  }

  // Handle image output (PNG)
  if (output.type === 'image' && output.format === 'png' && output.data) {
    return {
      output_type: 'display_data',
      data: {
        'image/png': output.data,
        'text/plain': ['<Figure>'],
      },
      metadata: {},
    };
  }

  // Handle image output (JPEG)
  if (output.type === 'image' && output.format === 'jpeg' && output.data) {
    return {
      output_type: 'display_data',
      data: {
        'image/jpeg': output.data,
        'text/plain': ['<Figure>'],
      },
      metadata: {},
    };
  }

  // Handle SVG output
  if (output.type === 'svg' && output.data) {
    return {
      output_type: 'display_data',
      data: {
        'image/svg+xml': output.data,
        'text/plain': ['<SVG>'],
      },
      metadata: {},
    };
  }

  // Handle HTML output
  if (output.type === 'html' && output.data) {
    return {
      output_type: 'display_data',
      data: {
        'text/html': [output.data],
        'text/plain': ['<HTML>'],
      },
      metadata: {},
    };
  }

  return null;
}

// GET /api/notebooks/[sessionId]/download - Download notebook as .ipynb
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const { data: cells, error } = await db.getNotebookCells(sessionId);

    if (error) {
      console.error('[Notebooks Download] Error fetching cells:', error);
      return NextResponse.json({ error: 'Failed to fetch notebook cells' }, { status: 500 });
    }

    if (!cells || cells.length === 0) {
      return NextResponse.json({ error: 'No cells found for this session' }, { status: 404 });
    }

    // Build valid .ipynb format
    const notebook: JupyterNotebook = {
      nbformat: 4,
      nbformat_minor: 5,
      metadata: {
        kernelspec: {
          display_name: 'Python 3',
          language: 'python',
          name: 'python3',
        },
        language_info: {
          name: 'python',
          version: '3.11.0',
          mimetype: 'text/x-python',
          file_extension: '.py',
        },
      },
      cells: cells.map((cell: any) => {
        // Parse outputs from JSON string if needed
        const outputs = typeof cell.outputs === 'string'
          ? JSON.parse(cell.outputs)
          : cell.outputs || [];

        // Convert outputs to Jupyter format
        const jupyterOutputs: JupyterOutput[] = outputs
          .map((output: any) => convertOutputToJupyter(output))
          .filter((output: JupyterOutput | null): output is JupyterOutput => output !== null);

        // Handle error cells
        if (!cell.success && cell.errorMessage) {
          jupyterOutputs.push({
            output_type: 'error',
            ename: 'Error',
            evalue: cell.errorMessage || cell.error_message || '',
            traceback: [],
          });
        }

        const cellType = (cell.cellType || cell.cell_type || 'code') as 'code' | 'markdown';

        return {
          cell_type: cellType,
          execution_count: cell.executionCount || cell.execution_count || null,
          metadata: {
            ...(cell.metadata ? (typeof cell.metadata === 'string' ? JSON.parse(cell.metadata) : cell.metadata) : {}),
            execution_time_ms: cell.executionTimeMs || cell.execution_time_ms,
            retry_count: cell.retryCount || cell.retry_count || 0,
          },
          source: cell.source.split('\n').map((line: string, i: number, arr: string[]) =>
            i === arr.length - 1 ? line : line + '\n'
          ),
          outputs: cellType === 'code' ? jupyterOutputs : undefined,
        };
      }),
    };

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `notebook-${sessionId.substring(0, 8)}-${timestamp}.ipynb`;

    return new NextResponse(JSON.stringify(notebook, null, 2), {
      headers: {
        'Content-Type': 'application/x-ipynb+json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[Notebooks Download] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
