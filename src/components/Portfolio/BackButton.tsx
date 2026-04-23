import { motion, AnimatePresence } from 'framer-motion';

interface BackButtonProps {
  visible: boolean;
  onClick: () => void;
  label?: string;
}

const BackButton = ({ visible, onClick, label = 'Back' }: BackButtonProps) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          onClick={onClick}
          className="absolute top-6 left-6 z-30 flex items-center gap-2 px-4 py-2 rounded-lg glass-surface text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>←</span> {label}
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default BackButton;
