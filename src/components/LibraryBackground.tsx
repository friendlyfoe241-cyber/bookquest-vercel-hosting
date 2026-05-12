import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import libraryBg1 from '@/assets/library-bg.jpg';
import libraryBg2 from '@/assets/library-bg-2.jpg';

const images = [libraryBg1, libraryBg2];
const CROSSFADE_DURATION = 8; // seconds per image
const PAN_DURATION = 25;

const FloatingSparkle = ({ delay, x, y }: { delay: number; x: string; y: string }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-full bg-yellow-300/60"
    style={{ left: x, top: y }}
    animate={{ y: [0, -20, 0], opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
    transition={{ repeat: Infinity, duration: 3, delay, ease: 'easeInOut' }}
  />
);

const sparkles = [
  { delay: 0, x: '10%', y: '18%' },
  { delay: 0.6, x: '75%', y: '12%' },
  { delay: 1.1, x: '45%', y: '28%' },
  { delay: 1.7, x: '85%', y: '38%' },
  { delay: 2.1, x: '20%', y: '55%' },
  { delay: 0.4, x: '60%', y: '22%' },
  { delay: 1.4, x: '30%', y: '42%' },
  { delay: 0.9, x: '52%', y: '48%' },
];

const LibraryBackground = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % images.length);
    }, CROSSFADE_DURATION * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Crossfading backgrounds */}
      <AnimatePresence initial={false}>
        <motion.div
          key={activeIndex}
          className="absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            scale: [1, 1.08, 1],
            x: [0, activeIndex % 2 === 0 ? -30 : 20, 0],
            y: [0, activeIndex % 2 === 0 ? -15 : 10, 0],
          }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 2, ease: 'easeInOut' },
            scale: { repeat: Infinity, duration: PAN_DURATION, ease: 'easeInOut' },
            x: { repeat: Infinity, duration: PAN_DURATION, ease: 'easeInOut' },
            y: { repeat: Infinity, duration: PAN_DURATION, ease: 'easeInOut' },
          }}
        >
          <img src={images[activeIndex]} alt="" className="w-full h-full object-cover" />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlay */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/80 via-black/50 to-black/30" />

      {/* Floating sparkles */}
      <div className="absolute inset-0 z-[2] pointer-events-none">
        {sparkles.map((s, i) => (
          <FloatingSparkle key={i} {...s} />
        ))}
      </div>
    </>
  );
};

export default LibraryBackground;
