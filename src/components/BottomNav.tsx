import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Search, Compass, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const NAV_ITEMS: Array<{ path: string; icon: typeof Compass; label: string; emoji?: string }> = [
    { path: '/discover', icon: Compass, label: 'Discover' },
    { path: '/foryou', icon: BookOpen, label: 'For You', emoji: '📚' },
    { path: '/library', icon: Search, label: 'Library' },
    { path: '/import', icon: Upload, label: 'Import' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-40">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center gap-0.5 py-2 px-3 transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-px left-2 right-2 h-0.5 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              {item.emoji && isActive ? (
                <span className="text-xl leading-5">{item.emoji}</span>
              ) : (
                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              )}
              <span className={`text-[10px] font-semibold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
