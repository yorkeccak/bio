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
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
              className="bg-muted/50 p-2.5 sm:p-4 rounded-xl border border-border hover:border-border/80 transition-colors hover:bg-muted text-left group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-foreground/80 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-foreground">
                🐍 Pharmacokinetics
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">
                Advanced Python modeling & calculations
              </div>
            </motion.button>

            <motion.button
              onClick={() =>
                onPromptClick(
                  "Search for recent Phase 3 clinical trials investigating CAR-T therapy for melanoma. Extract key endpoints, patient populations, and efficacy results. Compare different CAR-T constructs and their response rates."
                )
              }
              className="bg-muted/50 p-2.5 sm:p-4 rounded-xl border border-border hover:border-border/80 transition-colors hover:bg-muted text-left group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-foreground/80 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-foreground">
                🧬 Clinical Trials
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">
                Phase data & efficacy analysis
              </div>
            </motion.button>

            <motion.button
              onClick={() =>
                onPromptClick(
                  "Find recent PubMed papers on CRISPR gene editing safety in human trials. Create a CSV with study details, adverse events, off-target effects, and success rates. Generate charts showing safety trends over time and correlation with delivery methods."
                )
              }
              className="bg-muted/50 p-2.5 sm:p-4 rounded-xl border border-border hover:border-border/80 transition-colors hover:bg-muted text-left group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-foreground/80 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-foreground">
                📚 Literature Analysis
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">
                PubMed research & meta-analysis
              </div>
            </motion.button>

            <motion.button
              onClick={() =>
                onPromptClick(
                  "Search FDA drug labels for interactions between metformin, lisinopril, and atorvastatin. Identify contraindications, dosing adjustments, and mechanism of interactions. Create a comprehensive CSV with interaction severity, clinical significance, and monitoring recommendations."
                )
              }
              className="bg-muted/50 p-2.5 sm:p-4 rounded-xl border border-border hover:border-border/80 transition-colors hover:bg-muted text-left group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-foreground/80 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-foreground">
                💊 Drug Interactions
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">
                FDA labels & safety data
              </div>
            </motion.button>

            <motion.button
              onClick={() =>
                onPromptClick(
                  "Compare efficacy rates of the 5 major COVID-19 vaccines (Pfizer, Moderna, AstraZeneca, J&J, Novavax). Create a CSV with trial data: efficacy percentages, sample sizes, variant coverage, and adverse event rates. Generate visualizations showing: 1) Efficacy comparison by variant, 2) Safety profiles, 3) Durability of protection over time."
                )
              }
              className="bg-muted/50 p-2.5 sm:p-4 rounded-xl border border-border hover:border-border/80 transition-colors hover:bg-muted text-left group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-foreground/80 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-foreground">
                📊 Comparative Study
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">
                Multi-drug comparison with charts
              </div>
            </motion.button>

            <motion.button
              onClick={() =>
                onPromptClick(
                  "Do an in-depth analysis of pembrolizumab (Keytruda) for non-small cell lung cancer. Search clinical trials for efficacy data, find PubMed papers on mechanism of action and biomarkers, review FDA drug label for dosing and contraindications. Use Python to analyze trial data and create comprehensive CSV with: Trial phase, patient population, PD-L1 expression levels, response rates, progression-free survival, overall survival, and adverse events. Generate charts comparing outcomes across different patient subgroups."
                )
              }
              className="bg-info/5 p-2.5 sm:p-4 rounded-xl border border-info/20 hover:border-info/30 transition-colors hover:bg-info/10 text-left group col-span-1 sm:col-span-2 lg:col-span-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-info mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-info-foreground">
                🚀 Deep Investigation
              </div>
              <div className="text-[10px] sm:text-xs text-info/80">
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
