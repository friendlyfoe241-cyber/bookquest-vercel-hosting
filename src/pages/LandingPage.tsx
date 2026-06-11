import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ArrowRight, BookOpen, Sparkles, Trophy, Users, ChevronDown } from 'lucide-react';

const MONO_ICONS = {
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  scroll: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
      <path d="M19 3H9a2 2 0 0 0-2 2v14" />
    </svg>
  ),
  quest: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  ),
  compass: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  ),
  bookmark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  ),
  spark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
};

const FloatingParticles = () => {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 4 + 3,
    delay: Math.random() * 2,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-foreground/10"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [-20, 20, -20],
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

const ScrollRevealPath = ({ 
  path, 
  strokeLength = 1000,
  delay = 0,
  className = "" 
}: { 
  path: string; 
  strokeLength?: number;
  delay?: number;
  className?: string;
}) => {
  const ref = useRef<SVGPathElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full ${className}`}
      style={{ overflow: 'visible' }}
    >
      <path
        ref={ref}
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinecap="round"
        strokeDasharray={strokeLength}
        strokeDashoffset={isRevealed ? 0 : strokeLength}
        style={{
          transition: `stroke-dashoffset 2s ease-out ${delay}s`,
        }}
      />
    </svg>
  );
};

const HeroSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <motion.section 
      ref={ref}
      style={{ y, opacity }}
      className="relative min-h-screen flex items-center justify-center px-4 pt-20"
    >
      {/* Background decorative paths */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 text-foreground/5">
          <ScrollRevealPath 
            path="M50 10 C 70 20, 80 40, 50 50 C 20 60, 30 80, 50 90 C 70 80, 80 60, 50 50 C 20 40, 30 20, 50 10"
            strokeLength={300}
            className="w-full h-full"
          />
        </div>
        <div className="absolute bottom-40 right-20 w-48 h-48 text-foreground/5">
          <ScrollRevealPath 
            path="M24 48 L 24 24 L 48 24 M 24 24 L 24 48 L 48 48"
            strokeLength={150}
            delay={0.5}
            className="w-full h-full"
          />
        </div>
        <div className="absolute top-1/3 right-1/4 w-32 h-32 text-foreground/5">
          <ScrollRevealPath 
            path="M16 8 L 16 48 L 48 48 M 48 48 L 48 8 L 16 8"
            strokeLength={200}
            delay={1}
            className="w-full h-full"
          />
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto text-center">
        {/* Animated book stack */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative w-40 h-40 mx-auto mb-8"
        >
          <div className="absolute inset-0 text-foreground/20 animate-pulse">
            {MONO_ICONS.book}
          </div>
          <motion.div
            className="absolute inset-4 text-foreground/30"
            animate={{ rotate: [0, 5, 0, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            {MONO_ICONS.book}
          </motion.div>
          <motion.div
            className="absolute inset-0 text-foreground/10"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            {MONO_ICONS.book}
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="font-display text-6xl md:text-8xl mb-4 text-foreground"
        >
          BookQuest
        </motion.h1>

        {/* Subtitle with typewriter effect */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mb-8"
        >
          <p className="text-xl md:text-2xl text-muted-foreground">
            Your Reading Adventure Awaits
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 text-foreground/60">
            <span className="inline-block w-2 h-2 rounded-full bg-foreground/40 animate-pulse" />
            <span className="inline-block w-2 h-2 rounded-full bg-foreground/40 animate-pulse delay-100" />
            <span className="inline-block w-2 h-2 rounded-full bg-foreground/40 animate-pulse delay-200" />
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-foreground/50"
          >
            <ChevronDown className="w-8 h-8" />
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
};

const FeaturesSection = () => {
  const features = [
    {
      icon: MONO_ICONS.book,
      title: "Curated Library",
      description: "Discover books perfectly matched to your age and reading level",
      path: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
    },
    {
      icon: MONO_ICONS.trophy,
      title: "Achievements",
      description: "Earn rewards and badges as you complete books and quests",
      path: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22 M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22 M18 2H6v7a6 6 0 0 0 12 0V2Z",
    },
    {
      icon: MONO_ICONS.users,
      title: "Community",
      description: "Connect with friends, share reviews, and climb the leaderboard",
      path: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    },
    {
      icon: MONO_ICONS.compass,
      title: "Personalized",
      description: "AI-powered recommendations tailored just for you",
      path: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z",
    },
  ];

  return (
    <section className="relative py-32 px-4">
      {/* Connecting path lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        <motion.path
          d="M 100 200 Q 400 100 700 250 T 1300 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeDasharray="5 10"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.1 }}
          viewport={{ once: true }}
          transition={{ duration: 2 }}
          className="text-foreground/20"
        />
      </svg>

      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h2 className="font-display text-4xl md:text-5xl mb-4 text-foreground">
            Your Reading Journey
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every book is a new adventure. Track your progress, earn achievements, and become a reading champion.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="relative group"
            >
              {/* Feature card */}
              <div className="relative p-8 rounded-3xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-foreground/20 transition-all duration-500">
                {/* Icon container */}
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 rounded-2xl bg-foreground/5 group-hover:bg-foreground/10 transition-colors" />
                  <div className="relative w-full h-full p-4 text-foreground/70 group-hover:text-foreground transition-colors">
                    {feature.icon}
                  </div>
                  {/* Decorative SVG path */}
                  <div className="absolute -inset-4 -z-10 opacity-0 group-hover:opacity-30 transition-opacity duration-500">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <path
                        d={feature.path}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                        className="text-foreground/50"
                      />
                    </svg>
                  </div>
                </div>

                <h3 className="font-display text-2xl mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>

              {/* Connector dot */}
              <motion.div
                className="absolute -right-4 top-1/2 w-3 h-3 rounded-full bg-foreground/20"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 + 0.3 }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const StatsSection = () => {
  const stats = [
    { value: "10K+", label: "Books Available" },
    { value: "50K+", label: "Happy Readers" },
    { value: "1M+", label: "Pages Read" },
  ];

  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background path animation */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 1200 200" preserveAspectRatio="none">
          <motion.path
            d="M -100 100 Q 300 50 600 100 T 1300 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 0.1 }}
            viewport={{ once: true }}
            transition={{ duration: 3 }}
            className="text-foreground/20"
          />
        </svg>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="font-display text-4xl md:text-5xl mb-2 text-foreground">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative py-32 px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Decorative SVG paths */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]"
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          >
            <svg viewBox="0 0 200 200" className="w-full h-full text-foreground/5">
              <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 8" />
              <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="1 6" />
            </svg>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground/5 text-sm text-muted-foreground mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Begin your adventure today</span>
          </div>

          <h2 className="font-display text-4xl md:text-6xl mb-6 text-foreground">
            Ready to Start Reading?
          </h2>

          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Join thousands of readers on their journey through magical worlds and incredible stories.
          </p>

          <motion.button
            onClick={() => navigate('/welcome')}
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-foreground text-background font-bold text-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Get Started</span>
            <motion.span
              className="inline-block"
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className="w-5 h-5" />
            </motion.span>
            
            {/* Hover effect */}
            <div className="absolute inset-0 rounded-2xl bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

const SideButton = () => {
  const navigate = useNavigate();

  return (
    <motion.button
      onClick={() => navigate('/welcome')}
      className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-l-2xl bg-card/80 backdrop-blur-md border border-border/50 border-r-0 shadow-lg hover:shadow-xl transition-all group"
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 1.5, duration: 0.5 }}
      whileHover={{ x: -5 }}
    >
      <span className="text-sm font-medium text-foreground/70 group-hover:text-foreground transition-colors whitespace-nowrap">
        Enter App
      </span>
      <div className="w-8 h-8 rounded-full bg-foreground/10 group-hover:bg-foreground/20 transition-colors flex items-center justify-center">
        <ArrowRight className="w-4 h-4 text-foreground/70 group-hover:text-foreground transition-colors" />
      </div>
    </motion.button>
  );
};

const LandingPage = () => {
  const [showContent, setShowContent] = useState(true);

  useEffect(() => {
    // Preload animation
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <FloatingParticles />
      
      <AnimatePresence mode="wait">
        {showContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <HeroSection />
            <FeaturesSection />
            <StatsSection />
            <CTASection />
          </motion.div>
        )}
      </AnimatePresence>

      <SideButton />

      {/* Footer */}
      <footer className="relative py-8 px-4 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-6 h-6 text-foreground/50">
              {MONO_ICONS.book}
            </div>
            <span className="font-display">BookQuest</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Made with 
            <span className="inline-block w-4 h-4 mx-1 text-foreground/50 align-middle">
              {MONO_ICONS.spark}
            </span>
            for young readers everywhere
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;