// Presets de animacion compartidos (motion/react). Solo transform/opacity para que
// sean acelerados por GPU. Cada pagina decide con useReducedMotion si aplicarlos.

// Contenedor que hace aparecer sus hijos de forma escalonada.
export const gridStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

// Aparicion de un item (usar como variants del hijo dentro de un contenedor stagger).
export const revealUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 240, damping: 26 } },
};

// Entrada suave de una pagina completa.
export const pageFade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};
