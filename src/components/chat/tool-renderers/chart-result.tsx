"use client";

import { useState, useEffect, memo } from "react";
import { BiomedicalChart } from "@/components/financial-chart";

// ChartImageRenderer component - Fetches and renders charts from markdown references
const ChartImageRendererComponent = ({ chartId, alt }: { chartId: string; alt?: string }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchChart = async () => {
      try {
        const response = await fetch(`/api/charts/${chartId}`);
        if (cancelled) return;

        if (!response.ok) {
          setError(true);
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (cancelled) return;

        setChartData(data);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      }
    };

    fetchChart();

    return () => {
      cancelled = true;
    };
  }, [chartId]);

  if (loading) {
    return (
      <span className="block w-full border border-gray-200 dark:border-gray-700 rounded-lg p-12 my-4 text-center">
        <span className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></span>
        <span className="block mt-3 text-sm text-gray-500 dark:text-gray-400">Loading chart...</span>
      </span>
    );
  }

  if (error || !chartData) {
    return (
      <span className="block w-full border border-red-200 dark:border-red-700 rounded-lg p-6 my-4 text-center">
        <span className="text-sm text-red-600 dark:text-red-400">Failed to load chart</span>
      </span>
    );
  }

  return (
    <span className="block w-full my-4">
      <BiomedicalChart {...chartData} key={chartId} />
    </span>
  );
};

// Memoize ChartImageRenderer to prevent unnecessary re-fetches and re-renders
export const ChartImageRenderer = memo(ChartImageRendererComponent, (prevProps, nextProps) => {
  return prevProps.chartId === nextProps.chartId && prevProps.alt === nextProps.alt;
});
ChartImageRenderer.displayName = 'ChartImageRenderer';

// Memoized Chart Result - prevents re-rendering when props don't change
export const MemoizedChartResult = memo(function MemoizedChartResult({
  chartData,
  actionId,
  expandedTools,
  toggleToolExpansion
}: {
  chartData: any;
  actionId: string;
  expandedTools: Set<string>;
  toggleToolExpansion: (id: string) => void;
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <BiomedicalChart {...chartData} />
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.chartData === nextProps.chartData &&
    prevProps.actionId === nextProps.actionId &&
    prevProps.expandedTools === nextProps.expandedTools
  );
});
MemoizedChartResult.displayName = 'MemoizedChartResult';
