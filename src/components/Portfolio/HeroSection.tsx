import { motion } from 'framer-motion';
import headshot from '@/assets/headshot.jpg';

interface HeroSectionProps {
  onViewProjects: () => void;
}

const HeroSection = ({ onViewProjects }: HeroSectionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="absolute inset-0 z-10 flex items-center justify-center px-4 sm:px-8"
    >
      <div className="flex flex-col-reverse md:flex-row items-center gap-6 md:gap-12 max-w-5xl w-full">
        {/* Left side */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="flex-1 text-center md:text-left"
        >
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold font-display tracking-tight text-foreground mb-4">
            Thomas Coulon
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg">
            Building systems that identify weaknesses, track performance, and turn improvement into a measurable process.
          </p>
          <motion.button
            onClick={onViewProjects}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="px-8 py-3.5 rounded-lg font-medium text-primary-foreground bg-primary glow-primary transition-all duration-300 hover:shadow-lg hover:shadow-primary/30"
          >
            View Projects
          </motion.button>
        </motion.div>

        {/* Right side — headshot */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.9 }}
          className="flex-shrink-0"
        >
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 blur-xl" />
            <img
              src={headshot}
              alt="Professional headshot"
              width={280}
              height={350}
              className="relative w-44 h-44 sm:w-52 sm:h-52 md:w-72 md:h-72 rounded-full object-cover border-2 border-border"
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default HeroSection;
