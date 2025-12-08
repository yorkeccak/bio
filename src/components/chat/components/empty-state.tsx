"use client";

import { motion } from "framer-motion";
import DataSourceLogos from "@/components/data-source-logos";

interface EmptyStateProps {
  onPromptClick: (query: string) => void;
}

export const EmptyState = ({ onPromptClick }: EmptyStateProps) => {
  return (
    <motion.div
      className="pt-8 1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-6 sm:mb-8">
        {/* Capabilities */}
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-4 sm:mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Try these capabilities
            </h3>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 px-2 sm:px-0">
            <motion.button
              onClick={() =>
                onPromptClick(
                  "Calculate the half-life of warfarin based on plasma concentrations: 8mg/L at 0 hours, 4mg/L at 36 hours. Use Python to determine the elimination rate constant, volume of distribution, and clearance. Visualize the concentration-time curve with confidence intervals."
                )
              }
              className="bg-gray-50 dark:bg-gray-800/50 p-2.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-left group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-gray-100">
                🐍 Pharmacokinetics
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                Advanced Python modeling & calculations
              </div>
            </motion.button>

            <motion.button
              onClick={() =>
                onPromptClick(
                  "Search for recent Phase 3 clinical trials investigating CAR-T therapy for melanoma. Extract key endpoints, patient populations, and efficacy results. Compare different CAR-T constructs and their response rates."
                )
              }
              className="bg-gray-50 dark:bg-gray-800/50 p-2.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-left group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-gray-100">
                🧬 Clinical Trials
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                Phase data & efficacy analysis
              </div>
            </motion.button>

            <motion.button
              onClick={() =>
                onPromptClick(
                  "Find recent PubMed papers on CRISPR gene editing safety in human trials. Create a CSV with study details, adverse events, off-target effects, and success rates. Generate charts showing safety trends over time and correlation with delivery methods."
                )
              }
              className="bg-gray-50 dark:bg-gray-800/50 p-2.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-left group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-gray-100">
                📚 Literature Analysis
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                PubMed research & meta-analysis
              </div>
            </motion.button>

            <motion.button
              onClick={() =>
                onPromptClick(
                  "Search FDA drug labels for interactions between metformin, lisinopril, and atorvastatin. Identify contraindications, dosing adjustments, and mechanism of interactions. Create a comprehensive CSV with interaction severity, clinical significance, and monitoring recommendations."
                )
              }
              className="bg-gray-50 dark:bg-gray-800/50 p-2.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-left group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-gray-100">
                💊 Drug Interactions
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                FDA labels & safety data
              </div>
            </motion.button>

            <motion.button
              onClick={() =>
                onPromptClick(
                  "Compare efficacy rates of the 5 major COVID-19 vaccines (Pfizer, Moderna, AstraZeneca, J&J, Novavax). Create a CSV with trial data: efficacy percentages, sample sizes, variant coverage, and adverse event rates. Generate visualizations showing: 1) Efficacy comparison by variant, 2) Safety profiles, 3) Durability of protection over time."
                )
              }
              className="bg-gray-50 dark:bg-gray-800/50 p-2.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-left group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-gray-100">
                📊 Comparative Study
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                Multi-drug comparison with charts
              </div>
            </motion.button>

            <motion.button
              onClick={() =>
                onPromptClick(
                  "Do an in-depth analysis of pembrolizumab (Keytruda) for non-small cell lung cancer. Search clinical trials for efficacy data, find PubMed papers on mechanism of action and biomarkers, review FDA drug label for dosing and contraindications. Use Python to analyze trial data and create comprehensive CSV with: Trial phase, patient population, PD-L1 expression levels, response rates, progression-free survival, overall survival, and adverse events. Generate charts comparing outcomes across different patient subgroups."
                )
              }
              className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-2.5 sm:p-4 rounded-xl border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 text-left group col-span-1 sm:col-span-2 lg:col-span-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-blue-700 dark:text-blue-300 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-blue-900 dark:group-hover:text-blue-100">
                🚀 Deep Investigation
              </div>
              <div className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400">
                Multi-source research + Trial data + Efficacy analysis
              </div>
            </motion.button>
          </div>

          <div className="mt-4 sm:mt-8">
            <DataSourceLogos />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
