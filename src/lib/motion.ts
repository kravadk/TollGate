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
