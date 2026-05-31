import { motion } from 'framer-motion'

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#f5f5dc] via-white to-[#f5f5dc]">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0, 0, 0, 0.05) 0%, transparent 70%)',
            top: '20%',
            left: '10%',
          }}
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0, 0, 0, 0.03) 0%, transparent 70%)',
            bottom: '10%',
            right: '10%',
          }}
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -60, 0],
            y: [0, 60, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Loading content */}
      <div className="relative z-10 text-center">
        {/* Animated circles */}
        <motion.div className="relative mx-auto mb-8 w-32 h-32">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full"
              style={{
                background: i === 0 
                  ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.1) 100%)'
                  : i === 1
                  ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(245, 245, 220, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%)',
                border: '2px solid rgba(0, 0, 0, 0.1)',
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.6, 0.2, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            />
          ))}
          
          {/* Center dot */}
          <motion.div
            className="absolute inset-0 m-auto w-4 h-4 rounded-full bg-black"
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>

        {/* Loading text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold text-black mb-3">
            Loading
          </h2>
          <motion.div
            className="flex items-center justify-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-black"
                animate={{
                  y: [0, -10, 0],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.15,
                }}
              />
            ))}
          </motion.div>
        </motion.div>

        {/* Subtle message */}
        <motion.p
          className="mt-6 text-sm text-gray-700 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Preparing your experience
        </motion.p>
      </div>
    </div>
  )
}
