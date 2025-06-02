import { motion } from "framer-motion";

export function TypingIndicator() {
  return (
    <div className="flex space-x-1.5 px-3 py-1.5 bg-gray-900/50 rounded-lg max-w-fit">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ y: 0, opacity: 0.5 }}
          animate={{
            y: [-2, 1, -2],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.2,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
          className="w-1.5 h-1.5 bg-violet-500/80 hover:bg-violet-400 rounded-full"
        />
      ))}
    </div>
  );
}
