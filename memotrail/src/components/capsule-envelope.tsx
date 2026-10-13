import { motion, useReducedMotion } from "motion/react";
import { Heart } from "lucide-react";
import { usePreferences } from "@/stores/preferences";

export function CapsuleEnvelope({ open = false, sealing = false }: { open?: boolean; sealing?: boolean }) {
  const system = useReducedMotion();
  const reduced = usePreferences((state) => state.reduceMotion) || system;
  return <motion.div className={`capsule-envelope ${open ? "envelope-open" : ""}`} aria-hidden="true"
    initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: reduced || open || sealing ? 0 : [0, -3, 0] }} transition={{ duration: reduced ? 0 : 0.4, y: { duration: reduced ? 0 : 3, repeat: reduced || open || sealing ? 0 : 1 } }}>
    <motion.div className="capsule-paper" initial={sealing && !reduced ? { y: -45 } : false} animate={{ y: open ? -42 : 0 }} transition={{ duration: reduced ? 0 : 0.7 }} />
    <div className="capsule-envelope-front" />
    <motion.div className="capsule-flap" initial={sealing && !reduced ? { rotateX: 180 } : false} animate={{ rotateX: open ? 180 : 0 }} transition={{ duration: reduced ? 0 : 0.65 }} />
    {!open && <motion.span className="capsule-wax" initial={sealing && !reduced ? { scale: 1.8, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} transition={{ delay: reduced ? 0 : 0.45, duration: reduced ? 0 : 0.25 }}><Heart size={20} /></motion.span>}
  </motion.div>;
}
