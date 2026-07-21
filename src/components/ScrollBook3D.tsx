import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { BookOpen, Sparkles, ArrowRight } from 'lucide-react';

interface PageContent {
  id: string;
  title: string;
  subtitle?: string;
  content?: React.ReactNode;
  bgGradient: string;
  textColor: string;
}

const pageContents: PageContent[] = [
  {
    id: 'hero',
    title: 'Your Reading Journey',
    subtitle: 'Discover magical worlds',
    bgGradient: 'from-blue-600/20 via-purple-600/20 to-transparent',
    textColor: 'text-white',
  },
  {
    id: 'features',
    title: 'Explore Features',
    subtitle: 'Everything you need',
    bgGradient: 'from-purple-600/20 via-violet-600/20 to-transparent',
    textColor: 'text-white',
  },
  {
    id: 'stats',
    title: 'Our Community',
    subtitle: 'Growing together',
    bgGradient: 'from-emerald-600/20 via-teal-600/20 to-transparent',
    textColor: 'text-white',
  },
  {
    id: 'cta',
    title: 'Ready to Start?',
    subtitle: 'Join us today',
    bgGradient: 'from-amber-600/20 via-orange-600/20 to-transparent',
    textColor: 'text-white',
  },
];

interface BookPageProps {
  page: PageContent;
  index: number;
  isLeft: boolean;
  rotation: number;
}

const BookPage = ({ page, index, isLeft, rotation }: BookPageProps) => {
  const actualRotation = isLeft ? -rotation : rotation;
  
  return (
    <div 
      className="absolute inset-0 preserve-3d"
      style={{
        transformStyle: 'preserve-3d',
        transform: `rotateY(${actualRotation}deg)`,
        backfaceVisibility: 'hidden',
      }}
    >
      {/* Page background */}
      <div className={`absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 ${page.bgGradient} rounded-sm shadow-lg`}>
        {/* Page texture effect */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Page edge lines */}
        <div className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent" 
             style={{ left: '8%' }} />
        <div className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent" 
             style={{ right: '8%' }} />

        {/* Page content */}
        <div className={`absolute inset-0 flex flex-col justify-center px-8 ${isLeft ? 'pr-12' : 'pl-12'}`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="space-y-2"
          >
            <h3 className={`font-display text-2xl md:text-3xl font-bold ${page.textColor} drop-shadow-sm`}>
              {page.title}
            </h3>
            {page.subtitle && (
              <p className="text-slate-600 text-sm md:text-base">
                {page.subtitle}
              </p>
            )}
          </motion.div>

          {/* Page number */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-400 text-xs font-mono">
            {index + 1}
          </div>
        </div>
      </div>

      {/* Page shadow overlay */}
      <div 
        className="absolute inset-0 rounded-sm pointer-events-none"
        style={{
          boxShadow: isLeft 
            ? 'inset -10px 0 20px -10px rgba(0,0,0,0.15)' 
            : 'inset 10px 0 20px -10px rgba(0,0,0,0.15)',
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

  // Smooth out the scroll progress
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Book rotation based on scroll
  const bookRotateX = useTransform(smoothProgress, [0, 0.5, 1], [15, 0, -15]);
  const bookRotateY = useTransform(smoothProgress, [0, 0.5, 1], [-5, 0, 5]);
  const bookRotateZ = useTransform(smoothProgress, [0, 0.5, 1], [0, 0, 0]);
  const bookTranslateY = useTransform(smoothProgress, [0, 0.5, 1], [50, 0, -50]);

  // Page flip progress (each page flips at different scroll positions)
  const leftPageFlip1 = useTransform(smoothProgress, [0.05, 0.15], [0, -180]);
  const leftPageFlip2 = useTransform(smoothProgress, [0.2, 0.35], [0, -180]);
  const leftPageFlip3 = useTransform(smoothProgress, [0.4, 0.55], [0, -180]);
  const rightPageFlip1 = useTransform(smoothProgress, [0.1, 0.2], [0, 180]);
  const rightPageFlip2 = useTransform(smoothProgress, [0.3, 0.45], [0, 180]);
  const rightPageFlip3 = useTransform(smoothProgress, [0.5, 0.65], [0, 180]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[500px] md:h-[600px] flex items-center justify-center perspective-[1500px]"
      style={{ perspective: '1500px' }}
    >
      {/* Ambient glow behind book */}
      <motion.div
        className="absolute w-80 h-80 rounded-full bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-emerald-500/30 blur-3xl"
        style={{ y: bookTranslateY }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.7, 0.5],
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* Book container */}
      <motion.div
        className="relative w-[320px] md:w-[450px] h-[220px] md:h-[300px]"
        style={{
          rotateX: bookRotateX,
          rotateY: bookRotateY,
          rotateZ: bookRotateZ,
          y: bookTranslateY,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Book spine */}
        <div 
          className="absolute left-1/2 top-0 bottom-0 w-2 -translate-x-1/2 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 z-20"
          style={{ 
            transform: 'translateX(-50%) translateZ(1px)',
            boxShadow: '-2px 0 10px rgba(0,0,0,0.3), 2px 0 10px rgba(0,0,0,0.3)',
          }}
        >
          {/* Spine texture */}
          <div className="absolute inset-0 opacity-20">
            {Array.from({ length: 20 }).map((_, i) => (
              <div 
                key={i} 
                className="w-full h-px bg-slate-600"
                style={{ marginTop: `${i * 4}px` }}
              />
            ))}
          </div>
        </div>

        {/* Left pages stack */}
        <div 
          className="absolute left-0 top-0 w-[calc(50%-4px)] h-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Base left page (always visible) */}
          <div 
            className="absolute inset-0 rounded-sm shadow-lg"
            style={{ 
              transform: 'translateZ(0px)',
              transformOrigin: 'right center',
            }}
          >
            <BookPage 
              page={pageContents[0]} 
              index={0} 
              isLeft={true} 
              rotation={0}
            />
          </div>

          {/* Flipping left pages */}
          <motion.div
            className="absolute inset-0"
            style={{
              transformStyle: 'preserve-3d',
              transformOrigin: 'right center',
              rotateY: leftPageFlip1,
            }}
          >
            <BookPage page={pageContents[0]} index={1} isLeft={true} rotation={0} />
          </motion.div>
          
          <motion.div
            className="absolute inset-0"
            style={{
              transformStyle: 'preserve-3d',
              transformOrigin: 'right center',
              rotateY: leftPageFlip2,
            }}
          >
            <BookPage page={pageContents[1]} index={2} isLeft={true} rotation={0} />
          </motion.div>
          
          <motion.div
            className="absolute inset-0"
            style={{
              transformStyle: 'preserve-3d',
              transformOrigin: 'right center',
              rotateY: leftPageFlip3,
            }}
          >
            <BookPage page={pageContents[2]} index={3} isLeft={true} rotation={0} />
          </motion.div>

          {/* Page stack shadow */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-slate-300/50" />
        </div>

        {/* Right pages stack */}
        <div 
          className="absolute right-0 top-0 w-[calc(50%-4px)] h-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Base right page (always visible) */}
          <div 
            className="absolute inset-0 rounded-sm shadow-lg"
            style={{ 
              transform: 'translateZ(0px)',
              transformOrigin: 'left center',
            }}
          >
            <BookPage 
              page={pageContents[1]} 
              index={1} 
              isLeft={false} 
              rotation={0}
            />
          </div>

          {/* Flipping right pages */}
          <motion.div
            className="absolute inset-0"
            style={{
              transformStyle: 'preserve-3d',
              transformOrigin: 'left center',
              rotateY: rightPageFlip1,
            }}
          >
            <BookPage page={pageContents[1]} index={2} isLeft={false} rotation={0} />
          </motion.div>
          
          <motion.div
            className="absolute inset-0"
            style={{
              transformStyle: 'preserve-3d',
              transformOrigin: 'left center',
              rotateY: rightPageFlip2,
            }}
          >
            <BookPage page={pageContents[2]} index={3} isLeft={false} rotation={0} />
          </motion.div>
          
          <motion.div
            className="absolute inset-0"
            style={{
              transformStyle: 'preserve-3d',
              transformOrigin: 'left center',
              rotateY: rightPageFlip3,
            }}
          >
            <BookPage page={pageContents[3]} index={4} isLeft={false} rotation={0} />
          </motion.div>

          {/* Page stack shadow */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-l from-transparent to-slate-300/50" />
        </div>

        {/* Book cover/edge effect */}
        <div 
          className="absolute -left-1 top-0 bottom-0 w-3 bg-gradient-to-r from-slate-800 to-slate-700 rounded-l-sm"
          style={{ transform: 'translateX(-100%) translateZ(-1px)' }}
        />
        <div 
          className="absolute -right-1 top-0 bottom-0 w-3 bg-gradient-to-l from-slate-800 to-slate-700 rounded-r-sm"
          style={{ transform: 'translateX(100%) translateZ(-1px)' }}
        />
        <div 
          className="absolute -top-1 left-0 right-0 h-3 bg-gradient-to-b from-slate-900 to-slate-800 rounded-t-sm"
          style={{ transform: 'translateY(-100%) rotateX(90deg) translateZ(0px)', transformOrigin: 'bottom' }}
        />
        <div 
          className="absolute -bottom-1 left-0 right-0 h-3 bg-gradient-to-t from-slate-900 to-slate-800 rounded-b-sm"
          style={{ transform: 'translateY(100%) rotateX(-90deg) translateZ(0px)', transformOrigin: 'top' }}
        />
      </motion.div>

      {/* Floating particles around book */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
          style={{
            left: `${20 + (i * 10)}%`,
            top: `${30 + ((i % 3) * 20)}%`,
          }}
          animate={{
            y: [-10, 10, -10],
            opacity: [0.3, 0.8, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 3 + (i * 0.3),
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-400"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-xs uppercase tracking-wider">Scroll to flip</span>
        <motion.div
          className="w-6 h-10 rounded-full border-2 border-slate-600 flex items-start justify-center p-1"
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-slate-400"
            animate={{ y: [0, 16, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default OpenBook3D;
