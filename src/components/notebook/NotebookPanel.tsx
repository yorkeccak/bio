"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Play, ChevronRight, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotebookCell } from './NotebookCell';

interface NotebookCellData {
  id: string;
  cellIndex: number;
  cellType: 'code' | 'markdown';
  source: string;
  outputs: any[];
  executionCount: number | null;
  success: boolean;
  errorMessage?: string;
  executionTimeMs?: number;
  retryCount?: number;
}

interface NotebookPanelProps {
  sessionId: string | undefined;
  isOpen: boolean;
  onToggle: () => void;
}

export function NotebookPanel({ sessionId, isOpen, onToggle }: NotebookPanelProps) {
  const [cells, setCells] = useState<NotebookCellData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const fetchCells = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/notebooks/${sessionId}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch notebook');
      }

      const data = await response.json();
      setCells(data.cells || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchCells();
    }
  }, [isOpen, sessionId, fetchCells]);

  // Poll for updates when panel is open
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    const interval = setInterval(fetchCells, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [isOpen, sessionId, fetchCells]);

  const handleDownload = async () => {
    if (!sessionId || cells.length === 0) return;

    setDownloading(true);
    try {
      const response = await fetch(`/api/notebooks/${sessionId}/download`);
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notebook-${sessionId.substring(0, 8)}.ipynb`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download notebook');
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-orange-500 text-white p-2 rounded-l-lg shadow-lg hover:bg-orange-600 transition-colors z-50"
        title="Open Notebook"
      >
        <Play className="h-5 w-5" />
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 w-[500px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl z-40 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold">Notebook</h2>
            <span className="text-sm text-muted-foreground bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {cells.length} cells
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchCells}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={cells.length === 0 || downloading}
              title="Download as .ipynb"
            >
              <Download className={`h-4 w-4 mr-2 ${downloading ? 'animate-pulse' : ''}`} />
              .ipynb
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggle} title="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Cells */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && cells.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading notebook...
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              {error}
            </div>
          )}

          {!loading && cells.length === 0 && !error && (
            <div className="text-center py-8 text-muted-foreground">
              <Play className="h-8 w-8 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="font-medium">No code cells executed yet.</p>
              <p className="text-sm mt-1">
                Execute Python code in the chat to populate the notebook.
              </p>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {cells.map((cell, index) => (
              <NotebookCell
                key={cell.id}
                cell={cell}
                index={index}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {cells.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-muted-foreground text-center">
              {cells.filter(c => c.success).length} successful / {cells.filter(c => !c.success).length} failed
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
