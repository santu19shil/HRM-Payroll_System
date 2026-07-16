import React from 'react';
import { motion } from 'framer-motion';

const directions = {
  up: { y: 28, x: 0 },
  down: { y: -28, x: 0 },
  left: { x: -36, y: 0 },
  right: { x: 36, y: 0 },
  none: { x: 0, y: 0 },
};

export default function Reveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.8,
  distance,
  blur = 6,
  className,
  as = 'div',
  once = true,
  amount = 0.25,
}) {
  const offset = directions[direction] || directions.up;
  const initialDist = distance != null
    ? { x: 0, y: 0, ...(direction === 'left' || direction === 'right' ? { x: distance } : { y: distance }) }
    : offset;

  const MotionTag = motion[as] || motion.div;

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, filter: `blur(${blur}px)`, ...initialDist }}
      whileInView={{ opacity: 1, filter: 'blur(0px)', x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  );
}
