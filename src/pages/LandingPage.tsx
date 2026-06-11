import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ArrowRight, BookOpen, Sparkles, ChevronDown } from 'lucide-react';

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
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22 M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22 M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  compass: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  ),
  spark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
    </svg>
  ),
};

const FloatingParticles = () => {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 5 + 3,
    delay: Math.random() * 2,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full opacity-20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: 'currentColor',
          }}
          animate={{
            y: [-30, 30, -30],
            opacity: [0.1, 0.3, 0.1],
            scale: [0.8, 1.2, 0.8],
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
  className = "",
  color = "currentColor"
}: { 
  path: string; 
  strokeLength?: number;
  delay?: number;
  className?: string;
  color?: string;
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
        stroke={color}
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeDasharray={strokeLength}
        strokeDashoffset={isRevealed ? 0 : strokeLength}
        style={{
          transition: `stroke-dashoffset 2.5s ease-out ${delay}s`,
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
      {/* Dark Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900" />
      
      {/* Decorative Orbs - Brighter for dark mode */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-40 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl" />
      
      {/* Background decorative paths */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 text-blue-400/40">
          <ScrollRevealPath 
            path="M50 10 C 70 20, 80 40, 50 50 C 20 60, 30 80, 50 90 C 70 80, 80 60, 50 50 C 20 40, 30 20, 50 10"
            strokeLength={300}
            className="w-full h-full"
          />
        </div>
        <div className="absolute bottom-40 right-20 w-48 h-48 text-purple-400/40">
          <ScrollRevealPath 
            path="M24 48 L 24 24 L 48 24 M 24 24 L 24 48 L 48 48"
            strokeLength={150}
            delay={0.5}
            className="w-full h-full"
          />
        </div>
        <div className="absolute top-1/3 right-1/4 w-32 h-32 text-emerald-400/40">
          <ScrollRevealPath 
            path="M16 8 L 16 48 L 48 48 M 48 48 L 48 8 L 16 8"
            strokeLength={200}
            delay={1}
            className="w-full h-full"
          />
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto text-center">
        {/* Animated book icon */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative w-32 h-32 mx-auto mb-8"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl blur-xl opacity-60 animate-pulse" />
          <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
            <div className="text-white w-16 h-16">
              {MONO_ICONS.book}
            </div>
          </div>
          <motion.div
            className="absolute -inset-4 border-2 border-purple-400/50 rounded-3xl"
            animate={{ rotate: [0, 5, 0, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="font-display text-6xl md:text-8xl mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent"
        >
          BookQuest
        </motion.h1>

        {/* Subtitle */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mb-8"
        >
          <p className="text-xl md:text-2xl text-slate-300">
            Your Reading Adventure Awaits
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="inline-block w-2 h-2 rounded-full bg-purple-400 animate-pulse delay-100" />
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse delay-200" />
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
            className="text-slate-500"
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
      color: "blue",
    },
    {
      icon: MONO_ICONS.trophy,
      title: "Achievements",
      description: "Earn rewards and badges as you complete books and quests",
      color: "purple",
    },
    {
      icon: MONO_ICONS.users,
      title: "Community",
      description: "Connect with friends, share reviews, and climb the leaderboard",
      color: "emerald",
    },
    {
      icon: MONO_ICONS.compass,
      title: "Personalized",
      description: "AI-powered recommendations tailored just for you",
      color: "violet",
    },
  ];

  const colorClasses: Record<string, { bg: string; border: string; icon: string }> = {
    blue: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30 hover:border-blue-400",
      icon: "text-blue-400",
    },
    purple: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/30 hover:border-purple-400",
      icon: "text-purple-400",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30 hover:border-emerald-400",
      icon: "text-emerald-400",
    },
    violet: {
      bg: "bg-violet-500/10",
      border: "border-violet-500/30 hover:border-violet-400",
      icon: "text-violet-400",
    },
  };

  return (
    <section className="relative py-32 px-4 bg-slate-900">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-purple-950/50 to-slate-900" />
      
      {/* Connecting path lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        <motion.path
          d="M 100 200 Q 400 100 700 250 T 1300 200"
          fill="none"
          stroke="url(#featuresGradient)"
          strokeWidth="2"
          strokeDasharray="5 10"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.4 }}
          viewport={{ once: true }}
          transition={{ duration: 2 }}
        />
        <defs>
          <linearGradient id="featuresGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h2 className="font-display text-4xl md:text-5xl mb-4 text-white">
            Your Reading Journey
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Every book is a new adventure. Track your progress, earn achievements, and become a reading champion.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="relative group"
            >
              <div className={`relative p-8 rounded-3xl backdrop-blur-sm border-2 ${colorClasses[feature.color].border} ${colorClasses[feature.color].bg} transition-all duration-500 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10`}>
                {/* Icon container */}
                <div className="relative w-20 h-20 mb-6">
                  <div className={`absolute inset-0 rounded-2xl ${colorClasses[feature.color].bg} group-hover:scale-110 transition-transform`} />
                  <div className={`relative w-full h-full p-4 ${colorClasses[feature.color].icon} group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                </div>

                <h3 className="font-display text-2xl mb-2 text-white">
                  {feature.title}
                </h3>
                <p className="text-slate-400">
                  {feature.description}
                </p>
              </div>
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
    <section className="relative py-24 px-4 overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative max-w-4xl mx-auto">
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
              <div className="font-display text-4xl md:text-5xl mb-2 text-white font-bold">
                {stat.value}
              </div>
              <div className="text-sm text-white/80 font-medium">
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
    <section className="relative py-32 px-4 bg-slate-900">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900" />
      
      {/* Decorative circles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="100" r="80" fill="none" stroke="url(#ctaGradient)" strokeWidth="1" strokeDasharray="4 8" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="url(#ctaGradient2)" strokeWidth="0.5" strokeDasharray="2 6" />
            <defs>
              <linearGradient id="ctaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
              <linearGradient id="ctaGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 text-blue-300 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Begin your adventure today</span>
          </div>

          <h2 className="font-display text-4xl md:text-6xl mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
            Ready to Start Reading?
          </h2>

          <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto">
            Join thousands of readers on their journey through magical worlds and incredible stories.
          </p>

          <motion.button
            onClick={() => navigate('/welcome')}
            className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white font-bold text-lg shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Get Started</span>
            <motion.span
              className="inline-flex"
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className="w-5 h-5" />
            </motion.span>
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
      className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-l-2xl bg-slate-800/90 backdrop-blur-md border border-slate-700/50 border-r-0 shadow-xl hover:shadow-2xl transition-all group"
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 1.5, duration: 0.5 }}
      whileHover={{ x: -5 }}
    >
      <span className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors whitespace-nowrap">
        Enter App
      </span>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 group-hover:from-blue-400 group-hover:to-purple-400 transition-colors flex items-center justify-center shadow-lg">
        <ArrowRight className="w-4 h-4 text-white" />
      </div>
    </motion.button>
  );
};

const LandingPage = () => {
  const [showContent, setShowContent] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900">
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
      <footer className="relative py-8 px-4 bg-slate-950 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-6 h-6 text-blue-400">
              {MONO_ICONS.book}
            </div>
            <span className="font-display">BookQuest</span>
          </div>
          <p className="text-sm text-slate-500">
            Made with 
            <span className="inline-flex w-4 h-4 mx-1 text-purple-400 align-middle">
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