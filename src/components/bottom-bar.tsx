"use client";

import { motion } from "framer-motion";
import SocialLinks from "./social-links";

const BottomBar = () => {
  return (
    <>
      {/* Social Links - Bottom Left - Always visible on desktop, hidden on mobile */}
      <motion.div 
        className="fixed bottom-3 sm:bottom-6 left-3 sm:left-6 z-30 transition-opacity duration-300 hidden sm:block"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.5, ease: "easeOut" }}
      >
        <SocialLinks />
      </motion.div>
    </>
  );
};

export default BottomBar;