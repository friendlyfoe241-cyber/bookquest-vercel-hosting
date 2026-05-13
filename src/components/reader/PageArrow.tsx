import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface PageArrowProps {
  direction: 'left' | 'right';
  onClick: () => void;
  visible: boolean;
}

const PageArrow = ({ direction, onClick, visible }: PageArrowProps) => {
  if (!visible) return null;

  const isRight = direction === 'right';

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.4 }}
      whileHover={{ opacity: 0.9, scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center
        w-12 h-24 sm:w-16 sm:h-32
        ${isRight ? 'right-0 rounded-l-2xl' : 'left-0 rounded-r-2xl'}
        bg-gradient-to-${isRight ? 'l' : 'r'} from-foreground/10 to-transparent
        backdrop-blur-sm cursor-pointer select-none`}
      aria-label={isRight ? 'Next page' : 'Previous page'}
    >
      {isRight ? (
        <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10 text-foreground/60" />
      ) : (
        <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10 text-foreground/60" />
      )}
    </motion.button>
  );
};

export default PageArrow;
