'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X, Search, BookOpen, FileText, Table, BarChart3, Brain, Code, Clock, DollarSign } from 'lucide-react';
import { MessageMetrics, formatTime, formatCost } from '@/lib/metrics-calculator';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';

interface TimeSavedBreakdownDialogProps {
  metrics: MessageMetrics;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

export function TimeSavedBreakdownDialog({
  metrics,
  open,
  onOpenChange
}: TimeSavedBreakdownDialogProps) {
  const { breakdown, timeSavedMinutes, moneySaved } = metrics;
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const allTasks = [
    { name: 'Literature Search', minutes: breakdown.sourceFindingMinutes, icon: Search, description: 'Finding relevant studies & sources' },
    { name: 'Reading & Review', minutes: breakdown.sourceReadingMinutes, icon: BookOpen, description: 'Reviewing papers & documentation' },
    { name: 'Scientific Writing', minutes: breakdown.writingMinutes, icon: FileText, description: 'Synthesizing findings' },
    { name: 'Data Analysis', minutes: breakdown.analysisMinutes, icon: Brain, description: 'Statistical analysis & interpretation' },
    { name: 'Table Generation', minutes: breakdown.csvCreationMinutes, icon: Table, description: 'Creating data tables' },
    { name: 'Visualization', minutes: breakdown.chartCreationMinutes, icon: BarChart3, description: 'Creating figures & charts' },
    { name: 'Computation', minutes: breakdown.dataProcessingMinutes, icon: Code, description: 'Data processing & calculations' },
  ];

  // Create a color mapping for each task based on its position in allTasks
  const getTaskColor = (taskName: string) => {
    const index = allTasks.findIndex(t => t.name === taskName);
    return COLORS[index % COLORS.length];
  };

  // Only show active tasks (with minutes > 0) in the pie chart
  const activeTasks = allTasks.filter(task => task.minutes > 0);

  const chartData = activeTasks.map((task) => ({
    name: task.name,
    value: task.minutes,
    percentage: ((task.minutes / timeSavedMinutes) * 100).toFixed(1),
    color: getTaskColor(task.name),
  }));

  const totalHours = timeSavedMinutes / 60;
  const workDays = totalHours / 8;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-5xl !max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="pb-4 border-b border-gray-200 dark:border-gray-800">
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Research Time Analysis</DialogTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Automated research workflow breakdown</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-sky-950/20 dark:via-blue-950/20 dark:to-indigo-950/20 border border-sky-200 dark:border-sky-900/50 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 dark:bg-sky-500/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="text-sm font-medium text-sky-900 dark:text-sky-300">Research Time Saved</div>
            </div>
            <div className="text-3xl font-bold text-sky-950 dark:text-sky-100 mb-1">{formatTime(timeSavedMinutes)}</div>
            <div className="text-xs text-sky-700 dark:text-sky-400">Equivalent to {workDays.toFixed(1)} full research days</div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-cyan-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-sm font-medium text-emerald-900 dark:text-emerald-300">Institutional Value</div>
            </div>
            <div className="text-3xl font-bold text-emerald-950 dark:text-emerald-100 mb-1">{formatCost(moneySaved)}</div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400">Fully-loaded cost of senior researcher time (salary + benefits + overhead)</div>
          </div>
        </div>

        {/* Chart and Legend */}
        <div className="grid grid-cols-[1fr,280px] gap-6 py-2">
          {/* Pie Chart and Info */}
          <div className="flex items-center justify-center gap-6">
            <ResponsiveContainer width="60%" height={260}>
              <PieChart>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActiveIndex(allTasks.findIndex(t => t.name === activeTasks[index].name))}
                  onMouseLeave={() => setActiveIndex(undefined)}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} className="cursor-pointer" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Active Section Info */}
            <div className="flex flex-col justify-center min-w-[140px]">
              {activeIndex !== undefined && allTasks[activeIndex].minutes > 0 && (
                <>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {allTasks[activeIndex].name}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                    {formatTime(allTasks[activeIndex].minutes)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {((allTasks[activeIndex].minutes / timeSavedMinutes) * 100).toFixed(1)}% of total
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col justify-center space-y-1.5 py-2">
            {allTasks.map((task, idx) => {
              const Icon = task.icon;
              const isUsed = task.minutes > 0;
              const percentage = isUsed ? ((task.minutes / timeSavedMinutes) * 100).toFixed(1) : '0.0';
              const isActive = activeIndex === idx;
              const taskColor = getTaskColor(task.name);

              return (
                <div
                  key={idx}
                  onMouseEnter={() => isUsed ? setActiveIndex(idx) : undefined}
                  onMouseLeave={() => setActiveIndex(undefined)}
                  className={`flex items-center gap-2 p-1.5 rounded-lg transition-all ${
                    isUsed
                      ? `cursor-pointer ${isActive ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`
                      : 'opacity-40 cursor-default'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: isUsed ? taskColor : '#d1d5db' }}
                  />
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                    isUsed ? 'bg-gray-100 dark:bg-gray-800' : 'bg-gray-100/50 dark:bg-gray-800/50'
                  }`}>
                    <Icon className={`w-3 h-3 ${
                      isUsed ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium truncate ${
                      isUsed ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'
                    }`}>{task.name}</div>
                  </div>
                  <div className="flex items-baseline gap-1.5 flex-shrink-0">
                    <span className={`text-xs font-semibold tabular-nums ${
                      isUsed ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'
                    }`}>
                      {isUsed ? formatTime(task.minutes) : '—'}
                    </span>
                    <span className={`text-[10px] w-9 text-right tabular-nums ${
                      isUsed ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'
                    }`}>
                      {isUsed ? `${percentage}%` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
          <p className="text-[10px] text-gray-500 dark:text-gray-500 text-center leading-relaxed">
            Time estimates based on academic research benchmarks for senior biomedical researchers conducting systematic literature reviews, data synthesis, and manuscript preparation.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
