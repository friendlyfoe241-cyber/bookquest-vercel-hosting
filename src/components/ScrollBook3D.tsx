import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

interface PageData {
  title: string;
  subtitle: string;
}

const pages: PageData[] = [
  { title: 'Your Reading Journey', subtitle: 'Discover magical worlds' },
  { title: 'Explore Features', subtitle: 'Everything you need' },
  { title: 'Our Community', subtitle: 'Growing together' },
  { title: 'Ready to Start?', subtitle: 'Join us today' },
];

const BookPage = ({ title, subtitle, pageNum, isLeft }: { title: string; subtitle: string; pageNum: number; isLeft: boolean }) => {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 rounded-sm shadow-lg overflow-hidden">
      {/* Page lines */}
      <div className="absolute top-4 bottom-4 w-px bg-slate-200" style={{ left: '12%' }} />
      <div className="absolute top-4 bottom-4 w-px bg-slate-200" style={{ right: '12%' }} />
      
      {/* Content */}
      <div className={`absolute inset-0 flex flex-col justify-center px-10 ${isLeft ? 'pr-16' : 'pl-16'}`}>
        <h3 className="font-display text-2xl md:text-3xl font-bold text-slate-800 mb-2">
          {title}
        </h3>
        <p className="text-slate-500 text-sm md:text-base">
          {subtitle}
        </p>
      </div>
      
      {/* Page number */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-slate-400 text-xs font-mono">
        {pageNum}
      </div>
      
      {/* Shadow */}
      <div 
        className="absolute inset-0 pointer-events-none rounded-sm"
        style={{
          boxShadow: isLeft 
            ? 'inset -6px 0 12px -6px rgba(0,0,0,0.15)' 
            : 'inset 6px 0 12px -6px rgba(0,0,0,0.15)',
        }}
      />
    </div>
  );
};

const OpenBook3D = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Book float and rotation
  const bookY = useTransform(smoothProgress, [0, 0.5, 1], [80, 0, -80]);
  const bookRotateX = useTransform(smoothProgress, [0, 0.5, 1], [20, 0, -20]);
  const bookRotateY = useTransform(smoothProgress, [0, 0.5, 1], [-8, 0, 8]);

  // Page flips - sequential, left flips first then right
  const leftPageAngle = useTransform(smoothProgress, [0.08, 0.4], [0, -160]);
  const rightPageAngle = useTransform(smoothProgress, [0.5, 0.82], [0, 160]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[500px] md:h-[600px] flex items-center justify-center"
      style={{ perspective: '1000px' }}
    >
      {/* Glow */}
      <motion.div
        className="absolute w-72 h-72 rounded-full bg-gradient-to-r from-blue-500/25 via-purple-500/25 to-emerald-500/25 blur-3xl"
        style={{ y: bookY }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 5, repeat: Infinity }}
      />

      {/* Book */}
      <motion.div
        className="relative w-[300px] md:w-[420px] h-[200px] md:h-[280px]"
        style={{
          y: bookY,
          rotateX: bookRotateX,
          rotateY: bookRotateY,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Spine */}
        <div 
          className="absolute left-1/2 top-0 bottom-0 w-2.5 -translate-x-1/2 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 z-10"
          style={{ boxShadow: '-3px 0 12px rgba(0,0,0,0.4), 3px 0 12px rgba(0,0,0,0.4)' }}
        >
          <div className="absolute inset-0 opacity-25">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="w-full h-px bg-slate-500" style={{ marginTop: `${(i + 1) * 6}px` }} />
            ))}
          </div>
        </div>

        {/* Left page */}
        <motion.div
          className="absolute left-0 top-0 w-[calc(50%-5px)] h-full origin-right"
          style={{
            transformStyle: 'preserve-3d',
            rotateY: leftPageAngle,
          }}
        >
          <div className="absolute inset-0">
            <BookPage title={pages[0].title} subtitle={pages[0].subtitle} pageNum={1} isLeft={true} />
          </div>
          {/* Page edge thickness */}
          <div className="absolute -left-1 top-1 bottom-1 w-1.5 bg-gradient-to-r from-slate-200 to-slate-100 rounded-l-sm" style={{ transform: 'translateZ(-1px)' }} />
        </motion.div>

        {/* Right page */}
        <motion.div
          className="absolute right-0 top-0 w-[calc(50%-5px)] h-full origin-left"
          style={{
            transformStyle: 'preserve-3d',
            rotateY: rightPageAngle,
          }}
        >
          <div className="absolute inset-0">
            <BookPage title={pages[1].title} subtitle={pages[1].subtitle} pageNum={2} isLeft={false} />
          </div>
          {/* Page edge thickness */}
          <div className="absolute -right-1 top-1 bottom-1 w-1.5 bg-gradient-to-l from-slate-200 to-slate-100 rounded-r-sm" style={{ transform: 'translateZ(-1px)' }} />
        </motion.div>

        {/* Book covers */}
        <div className="absolute -left-2 top-0 bottom-0 w-3 bg-gradient-to-r from-slate-900 to-slate-800 rounded-l-md" style={{ transform: 'translateZ(-3px)' }} />
        <div className="absolute -right-2 top-0 bottom-0 w-3 bg-gradient-to-l from-slate-900 to-slate-800 rounded-r-md" style={{ transform: 'translateZ(-3px)' }} />
        <div className="absolute -top-1 left-0 right-0 h-3 bg-gradient-to-b from-slate-900 to-slate-800 rounded-t-md" style={{ transform: 'translateZ(-3px) rotateX(90deg)', transformOrigin: 'bottom' }} />
        <div className="absolute -bottom-1 left-0 right-0 h-3 bg-gradient-to-t from-slate-900 to-slate-800 rounded-b-md" style={{ transform: 'translateZ(-3px) rotateX(-90deg)', transformOrigin: 'top' }} />
      </motion.div>

      {/* Floating particles */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
          style={{ left: `${15 + i * 14}%`, top: `${25 + (i % 3) * 25}%` }}
          animate={{ y: [-12, 12, -12], opacity: [0.2, 0.7, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.25 }}
        />
      ))}

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-slate-400"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-[10px] uppercase tracking-widest">Scroll</span>
        <div className="w-5 h-8 rounded-full border border-slate-600 flex items-start justify-center p-0.5">
          <motion.div className="w-1 h-1.5 rounded-full bg-slate-400" animate={{ y: [0, 12, 0] }} transition={{ duration: 2, repeat: Infinity }} />
        </div>
      </motion.div>
    </div>
  );
};

export default OpenBook3D;
