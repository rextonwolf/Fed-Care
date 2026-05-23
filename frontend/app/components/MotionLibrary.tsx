'use client';

import React from 'react';
import { motion, Variants, MotionProps, AnimatePresence } from 'framer-motion';

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

export const fadeUpVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const scalePopVariant: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
};

export const slideInLeftVariant: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export const slideInRightVariant: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
};

export const scaleBlurInVariant: Variants = {
  hidden: { opacity: 0, scale: 0.95, filter: 'blur(10px)' },
  visible: { opacity: 1, scale: 1, filter: 'blur(0px)' },
};

export const chipPopVariant: Variants = {
  hidden: { opacity: 0, scale: 0, y: -10 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0, y: -10 },
};

// ============================================================================
// TRANSITION PRESETS
// ============================================================================

export const springTransition = { type: 'spring' as const, stiffness: 120, damping: 15 };
export const smoothTransition = { duration: 0.5, ease: 'easeOut' as const };
export const slowTransition = { duration: 0.8, ease: 'easeOut' as const };

// ============================================================================
// CONTAINER: Staggered Children
// ============================================================================

interface StaggerContainerProps extends MotionProps {
  children: React.ReactNode;
  delay?: number;
  staggerValue?: number;
  delayChildren?: number;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  delay = 0,
  staggerValue = 0.08,
  delayChildren = delay,
  ...props
}) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerValue,
            delayChildren: delayChildren,
          },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// ============================================================================
// CARD: Entrance with hover lift
// ============================================================================

interface AnimatedCardProps extends MotionProps {
  children: React.ReactNode;
  delay?: number;
  hoverScale?: number;
  hoverY?: number;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  delay = 0,
  hoverScale = 1.03,
  hoverY = -4,
  ...props
}) => {
  return (
    <motion.div
      variants={fadeUpVariant}
      initial="hidden"
      animate="visible"
      transition={{ ...springTransition, delay }}
      whileHover={{
        scale: hoverScale,
        y: hoverY,
        transition: { duration: 0.2 },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// ============================================================================
// ANIMATED NUMBER: Counter effect
// ============================================================================

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 0.8,
  decimals = 0,
  prefix = '',
  suffix = '',
}) => {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    let startTime: number;
    let animationId: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);

      setDisplayValue(Math.floor(value * progress * Math.pow(10, decimals)) / Math.pow(10, decimals));

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [value, duration, decimals]);

  return (
    <span className="font-mono">
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
};

// ============================================================================
// PROGRESS BAR: Animated width with glow
// ============================================================================

interface AnimatedProgressBarProps {
  value: number;
  duration?: number;
  color?: 'cyan' | 'emerald' | 'red' | 'yellow';
  showGlow?: boolean;
  className?: string;
}

const colorMap: Record<string, { bar: string; glow: string }> = {
  cyan: { bar: 'bg-cyan-500', glow: '0 0 12px rgba(34,211,238,0.6)' },
  emerald: { bar: 'bg-emerald-500', glow: '0 0 12px rgba(5,150,105,0.6)' },
  red: { bar: 'bg-red-500', glow: '0 0 12px rgba(220,38,38,0.6)' },
  yellow: { bar: 'bg-yellow-500', glow: '0 0 12px rgba(234,179,8,0.6)' },
};

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  value,
  duration = 1.5,
  color = 'cyan',
  showGlow = true,
  className = '',
}) => {
  const { bar, glow } = colorMap[color];

  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-200 ${className}`}>
      <motion.div
        className={`h-full rounded-full ${bar}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, value)}%` }}
        transition={{ duration, ease: 'easeOut' }}
        style={showGlow ? { boxShadow: glow } : {}}
      />
    </div>
  );
};

// ============================================================================
// CHIP: Pop entrance with stagger
// ============================================================================

interface EntranceChipProps extends MotionProps {
  children: React.ReactNode;
  delay?: number;
  onRemove?: () => void;
}

export const EntranceChip: React.FC<EntranceChipProps> = ({
  children,
  delay = 0,
  onRemove,
  ...props
}) => {
  return (
    <motion.div
      variants={chipPopVariant}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ ...springTransition, delay }}
      whileHover={{ scale: 1.05 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// ============================================================================
// RESULT CARD: Premium entrance with glow
// ============================================================================

interface ResultCardProps extends MotionProps {
  children: React.ReactNode;
  isHighRisk?: boolean;
  duration?: number;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  children,
  isHighRisk = false,
  duration = 0.6,
  ...props
}) => {
  const glowColor = isHighRisk ? 'rgba(220,38,38,0.2)' : 'rgba(5,150,105,0.2)';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      animate={{
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
      }}
      transition={{ duration, type: 'spring', bounce: 0.3 }}
      style={{
        boxShadow: `0 0 40px ${glowColor}`,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// ============================================================================
// LIST ITEM: Staggered with optional hover
// ============================================================================

interface ListItemProps extends MotionProps {
  children: React.ReactNode;
  delay?: number;
  variant?: 'slideInLeft' | 'slideInRight' | 'fadeUp' | 'scalePop';
  hoverTranslate?: number;
  hoverScale?: number;
}

const variantMap: Record<string, Variants> = {
  slideInLeft: slideInLeftVariant,
  slideInRight: slideInRightVariant,
  fadeUp: fadeUpVariant,
  scalePop: scalePopVariant,
};

export const ListItem: React.FC<ListItemProps> = ({
  children,
  delay = 0,
  variant = 'slideInLeft',
  hoverTranslate = 4,
  hoverScale = 1,
  ...props
}) => {
  return (
    <motion.div
      variants={variantMap[variant]}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      transition={{ ...springTransition, delay }}
      whileHover={
        hoverTranslate !== 0 || hoverScale !== 1
          ? {
              x: hoverTranslate,
              scale: hoverScale,
              transition: { duration: 0.2 },
            }
          : undefined
      }
      {...props}
    >
      {children}
    </motion.div>
  );
};

// ============================================================================
// ICON BUTTON: Rotation on hover
// ============================================================================

interface IconButtonProps extends MotionProps {
  children: React.ReactNode;
  hoverRotate?: number;
  hoverScale?: number;
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  hoverRotate = 12,
  hoverScale = 1.15,
  ...props
}) => {
  return (
    <motion.div
      whileHover={{
        rotate: hoverRotate,
        scale: hoverScale,
        transition: { duration: 0.2 },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// ============================================================================
// VIEWPORT FADE IN: Scroll-triggered reveal
// ============================================================================

interface ViewportFadeInProps extends MotionProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}

export const ViewportFadeIn: React.FC<ViewportFadeInProps> = ({
  children,
  delay = 0,
  duration = 0.6,
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// ============================================================================
// PAGE TRANSITION: Cross-page fade
// ============================================================================

interface PageTransitionProps extends MotionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export { AnimatePresence };
