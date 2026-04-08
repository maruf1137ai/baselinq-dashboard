import React from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

interface AwesomeLoaderProps {
  message?: string;
  fullPage?: boolean;
  compact?: boolean;
}

export const AwesomeLoader: React.FC<AwesomeLoaderProps> = ({
  message = "Analyzing Project Data",
  fullPage = false,
  compact = false,
}) => {
  const containerClasses = fullPage
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-muted dark:bg-[#0B0C10]"
    : compact
    ? "flex flex-col items-center justify-center p-6 w-full bg-transparent relative overflow-hidden"
    : "flex flex-col items-center justify-center p-12 w-full min-h-[400px] bg-transparent relative overflow-hidden";

  return (
    <div className={containerClasses}>
      {/* AI Construction Atmosphere - Blueprint Grid */}
      <div className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#8081F6 1px, transparent 1px), linear-gradient(90deg, #8081F6 1px, transparent 1px)",
          backgroundSize: "32px 32px"
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Core Container: The "Squircy" Round Box */}
        <div className={`relative flex items-center justify-center ${compact ? "h-20 w-20" : "h-40 w-40"}`}>

          {/* Pulsing Outer Boundary */}
          <motion.div
            className="absolute inset-0 border border-primary/20 rounded-full"
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Main "Squery Round Box" */}
          <motion.div
            className={`relative bg-white dark:bg-gray-900 border-2 border-primary/40 rounded-full shadow-xl flex items-center justify-center overflow-hidden ${compact ? "h-12 w-12" : "h-24 w-24"}`}
            animate={{
              borderRadius: ["28px", "40px", "28px"],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Interior Scanning Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent"
              animate={{
                top: ["-100%", "100%"]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />

            {/* The Animating Search Icon */}
            <motion.div
              className="relative z-20 text-primary"
              animate={{
                x: compact ? [-8, 8, -8] : [-15, 15, -15],
                y: compact ? [-5, 5, -5] : [-10, 10, -10],
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Search size={compact ? 16 : 32} strokeWidth={2.5} />
            </motion.div>
          </motion.div>

          {/* Orbiting Tech Accents */}
          {[0, 90, 180, 270].map((angle, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_#8081F6]"
              animate={{
                rotate: angle + 360,
              }}
              style={{
                top: "50%",
                left: "50%",
                marginTop: "-0.75px",
                marginLeft: "-0.75px",
              }}
              transition={{
                duration: 6 + i,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <div
                className="w-1.5 h-1.5 bg-primary rounded-full"
                style={{ transform: `translate(${compact ? 35 : 70}px)` }}
              />
            </motion.div>
          ))}
        </div>

        {/* AI Status Pill with Integrated Message */}
        <div className={`flex flex-col items-center ${compact ? "mt-5" : "mt-12"}`}>
          <motion.div
            className={`inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 shadow-sm ${compact ? "px-3 py-1.5" : "px-5 py-2"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Heartbeat / Activity Pulse */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>

            <span className={`font-normal text-primary uppercase tracking-[0.15em] whitespace-nowrap ${compact ? "text-[10px]" : "text-xs"}`}>
              {message}
            </span>
          </motion.div>

        </div>
      </div>
    </div>
  );
};
