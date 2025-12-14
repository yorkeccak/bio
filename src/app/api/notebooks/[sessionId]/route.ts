import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';

// GET /api/notebooks/[sessionId] - Get notebook cells for a session
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
      console.error('[Notebooks API] Error fetching cells:', error);
      return NextResponse.json({ error: 'Failed to fetch notebook cells' }, { status: 500 });
    }

    // Parse JSON fields for each cell
    const parsedCells = (cells || []).map((cell: any) => ({
      id: cell.id,
      sessionId: cell.sessionId || cell.session_id,
      cellIndex: cell.cellIndex || cell.cell_index,
      cellType: cell.cellType || cell.cell_type || 'code',
      source: cell.source,
      outputs: typeof cell.outputs === 'string' ? JSON.parse(cell.outputs) : cell.outputs,
      executionCount: cell.executionCount || cell.execution_count,
      metadata: cell.metadata ? (typeof cell.metadata === 'string' ? JSON.parse(cell.metadata) : cell.metadata) : {},
      executionTimeMs: cell.executionTimeMs || cell.execution_time_ms,
      success: cell.success,
      errorMessage: cell.errorMessage || cell.error_message,
      retryCount: cell.retryCount || cell.retry_count || 0,
      createdAt: cell.createdAt || cell.created_at,
    }));

    return NextResponse.json({
      sessionId,
      cells: parsedCells,
      cellCount: parsedCells.length,
    });
  } catch (error) {
    console.error('[Notebooks API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
