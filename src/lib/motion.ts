/* Shared framer-motion presets — premium easing curves + reusable variants. */

export const easePremium: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const easeSpring: [number, number, number, number] = [0.34, 1.56, 0.64, 1];
export const easeSmooth: [number, number, number, number] = [0.4, 0, 0.2, 1];

export const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  show: { opacity: 1, y: 0, transition: { duration: 1.1, ease: easePremium } },
};

export const fadeInUpSmall = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easePremium } },
};

export const fadeInScale = {
  hidden: { opacity: 0, scale: 0.9, y: 30 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.8, ease: easePremium } },
};

export const staggerSlow = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};

export const staggerFast = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};

/* Slightly snappier stagger for dense card/table grids. */
export const staggerCards = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

export const slideInLeft = {
  hidden: { opacity: 0, x: -24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: easePremium } },
};

export const slideInRight = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: easePremium } },
};

/* Modal / popover entrance — gentle spring scale-in. */
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 24, stiffness: 280 } },
  exit: { opacity: 0, scale: 0.96, y: 4, transition: { duration: 0.16, ease: easeSmooth } },
};

/* Bouncy pop — for badges, confirmations, small accents. */
export const popIn = {
  hidden: { opacity: 0, scale: 0.7 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", damping: 14, stiffness: 320 } },
};

/* Table row entrance — used with a per-row stagger delay. */
export const tableRow = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: easeSmooth } },
};

/* Spread onto a motion element to get the standard card hover/press feel. */
export const cardHover = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.99 },
  transition: { type: "spring", damping: 20, stiffness: 320 },
};
