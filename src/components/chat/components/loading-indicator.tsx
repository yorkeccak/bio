"use client";

import { motion } from "framer-motion";

// Coffee Loading Message
export const LoadingIndicator = () => {
  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="flex items-start gap-2">
        <div className="text-amber-600 dark:text-amber-400 text-lg mt-0.5">
          ☕
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2 max-w-xs">
          <div className="text-amber-700 dark:text-amber-300 text-sm">
            Just grabbing a coffee and contemplating the meaning of
            life... ☕️
          </div>
        </div>
      </div>
    </motion.div>
  );
};
