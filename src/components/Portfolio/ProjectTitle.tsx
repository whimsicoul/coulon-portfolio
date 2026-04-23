import { motion, AnimatePresence } from 'framer-motion';
import { projects } from '@/data/projectData';

interface ProjectTitleProps {
  projectIndex: number | null;
  visible: boolean;
}

const ProjectTitle = ({ projectIndex, visible }: ProjectTitleProps) => {
  const project = projectIndex !== null ? projects[projectIndex] : null;

  return (
    <AnimatePresence>
      {visible && project && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="absolute top-6 left-1/2 -translate-x-1/2 z-20 text-center"
        >
          <h2 className="text-xl md:text-2xl font-display font-bold text-foreground mb-1">
            {project.url ? (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-sky-400 transition-colors duration-200 underline underline-offset-4 decoration-sky-400/50"
              >
                {project.title}
              </a>
            ) : (
              project.title
            )}
          </h2>
          <p className="text-xs text-muted-foreground font-mono">{project.subtitle}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProjectTitle;
