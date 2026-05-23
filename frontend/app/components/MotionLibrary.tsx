'use client';

import React from 'react';
import { motion, Variants, MotionProps, AnimatePresence, useReducedMotion } from 'framer-motion';

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

export const fadeUpVariant: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
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
  hidden: { opacity: 0, scale: 0.96, filter: 'blur(6px)' },
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
  className?: string;
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
  className?: string;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  delay = 0,
  hoverScale = 1.015,
  hoverY = -2,
  ...props
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={fadeUpVariant}
      initial="hidden"
      animate="visible"
      transition={{ ...springTransition, delay }}
      whileHover={prefersReducedMotion ? undefined : {
        scale: hoverScale,
        y: hoverY,
        transition: { type: 'spring', stiffness: 220, damping: 24, mass: 0.8 },
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
  const prefersReducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = React.useState(0);
  const currentValueRef = React.useRef(0);
  const animationIdRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (prefersReducedMotion) {
      animationIdRef.current = requestAnimationFrame(() => {
        setDisplayValue(value);
        currentValueRef.current = value;
      });
      return;
    }

    const fromValue = currentValueRef.current;
    const delta = value - fromValue;
    let startTime: number | undefined;

    if (animationIdRef.current != null) {
      cancelAnimationFrame(animationIdRef.current);
    }

    const animate = (currentTime: number) => {
      if (startTime === undefined) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const nextValue = fromValue + delta * eased;
      setDisplayValue(nextValue);
      currentValueRef.current = nextValue;

      if (progress < 1) {
        animationIdRef.current = requestAnimationFrame(animate);
      } else {
        currentValueRef.current = value;
      }
    };

    animationIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationIdRef.current != null) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [value, duration, decimals, prefersReducedMotion]);

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
  cyan: { bar: 'bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600', glow: '0 0 16px rgba(34,211,238,0.35)' },
  emerald: { bar: 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-600', glow: '0 0 16px rgba(5,150,105,0.35)' },
  red: { bar: 'bg-gradient-to-r from-rose-400 via-red-500 to-rose-600', glow: '0 0 16px rgba(220,38,38,0.32)' },
  yellow: { bar: 'bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500', glow: '0 0 16px rgba(234,179,8,0.3)' },
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
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-200/70 ${className}`}>
      <motion.div
        className={`relative h-full rounded-full ${bar}`}
        initial={{ width: 0, opacity: 0.85 }}
        animate={{ width: `${Math.min(100, value)}%`, opacity: 1 }}
        transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
        style={showGlow ? { boxShadow: glow } : undefined}
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
  className?: string;
}

export const EntranceChip: React.FC<EntranceChipProps> = ({
  children,
  delay = 0,
  onRemove,
  ...props
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={chipPopVariant}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ ...springTransition, delay }}
      whileHover={prefersReducedMotion ? undefined : { scale: 1.04, y: -1 }}
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
  className?: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  children,
  isHighRisk = false,
  duration = 0.6,
  ...props
}) => {
  const prefersReducedMotion = useReducedMotion();
  const glowColor = isHighRisk ? 'rgba(220,38,38,0.2)' : 'rgba(5,150,105,0.2)';

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.965, filter: 'blur(6px)' }}
      animate={{
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
      }}
      transition={{ duration, type: 'spring', stiffness: 140, damping: 18 }}
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
  className?: string;
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
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={variantMap[variant]}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      transition={{ ...springTransition, delay }}
      whileHover={
        prefersReducedMotion
          ? undefined
          :
        hoverTranslate !== 0 || hoverScale !== 1
          ? {
              x: hoverTranslate,
              scale: hoverScale,
              transition: { type: 'spring', stiffness: 260, damping: 24 },
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
  className?: string;
}

export const ViewportFadeIn: React.FC<ViewportFadeInProps> = ({
  children,
  delay = 0,
  duration = 0.6,
  ...props
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
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
