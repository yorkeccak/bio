"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Live Reasoning Preview - shows latest **title** + 2 most recent lines
// Lines wrap and stream/switch as new content comes in
export const LiveReasoningPreview = memo(({ title, lines }: { title: string; lines: string[] }) => {
  if (!title && lines.length === 0) return null;

  // Always show the last 2 lines
  const displayLines = lines.slice(-2);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className="my-1 ml-3 sm:ml-8 mr-3 sm:mr-0"
    >
      <div className="bg-blue-50/50 dark:bg-blue-950/20 border-l-2 border-blue-300 dark:border-blue-700 rounded-r px-2 sm:px-2.5 py-1.5 space-y-1 overflow-hidden max-w-full">
        {/* Show the latest **title** */}
        {title && (
          <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 truncate">
            {title}
          </div>
        )}

        {/* Show 2 most recent lines - each limited to 1 visual line */}
        <AnimatePresence mode="popLayout">
          {displayLines.map((line, index) => (
            <motion.div
              key={`${displayLines.length}-${index}-${line.substring(0, 30)}`}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.08 }}
              className="text-xs text-gray-500 dark:text-gray-400 leading-snug truncate max-w-full"
            >
              {line}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

LiveReasoningPreview.displayName = 'LiveReasoningPreview';
