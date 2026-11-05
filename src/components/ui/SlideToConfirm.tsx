"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ChevronsRight, Check, Loader2 } from "lucide-react";

interface SlideToConfirmProps {
  label: string;
  onConfirm: () => void | Promise<void>;
  className?: string;
  disabled?: boolean;
}

export function SlideToConfirm({
  label,
  onConfirm,
  className = "",
  disabled = false,
}: SlideToConfirmProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxDrag, setMaxDrag] = useState(160);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const x = useMotionValue(0);

  const thumbWidth = 34;
  const padding = 3;

  useEffect(() => {
    const updateMaxDrag = () => {
      if (trackRef.current) {
        const width = trackRef.current.clientWidth;
        const available = Math.max(50, width - thumbWidth - padding * 2);
        setMaxDrag(available);
      }
    };

    updateMaxDrag();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && trackRef.current) {
      resizeObserver = new ResizeObserver(() => updateMaxDrag());
      resizeObserver.observe(trackRef.current);
    }

    window.addEventListener("resize", updateMaxDrag);
    return () => {
      window.removeEventListener("resize", updateMaxDrag);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, []);

  // Reactive fill width and text opacity based on drag progress
  const fillWidth = useTransform(x, [0, maxDrag], [`${thumbWidth + padding * 2}px`, "100%"]);
  const textOpacity = useTransform(x, [0, Math.max(20, maxDrag * 0.55)], [1, 0.1]);

  const handleDragEnd = async (
    _: unknown,
    info: { offset: { x: number }; velocity: { x: number } }
  ) => {
    if (disabled || isConfirmed || isProcessing) return;

    const currentX = x.get();
    // Confirms if dragged at least 68% of the way or with positive horizontal velocity
    const shouldConfirm =
      currentX >= maxDrag * 0.68 ||
      info.offset.x >= maxDrag * 0.68 ||
      (currentX >= maxDrag * 0.4 && info.velocity.x > 300);

    if (shouldConfirm) {
      setIsConfirmed(true);
      setIsProcessing(true);
      // Animate smoothly to the right end
      animate(x, maxDrag, { duration: 0.18, ease: "easeOut" });

      try {
        await onConfirm();
      } catch (err) {
        console.error("Slide to confirm failed:", err);
        setIsConfirmed(false);
        setIsProcessing(false);
        animate(x, 0, { duration: 0.25, ease: "easeInOut" });
      }
    } else {
      // Smooth spring back to start
      animate(x, 0, { type: "spring", stiffness: 450, damping: 30 });
    }
  };

  return (
    <div
      ref={trackRef}
      className={`relative h-9 w-full min-w-[210px] rounded-xl border border-[#33293c] bg-[#16121b] p-[3px] overflow-hidden select-none touch-none flex items-center ${
        disabled ? "opacity-50 pointer-events-none" : ""
      } ${className}`}
    >
      {/* Progress highlight following the drag gesture */}
      <motion.div
        style={{ width: isConfirmed ? "100%" : fillWidth }}
        className={`absolute left-0 top-0 bottom-0 rounded-xl transition-colors duration-200 pointer-events-none ${
          isConfirmed
            ? "bg-gradient-to-r from-[#211c29] to-[#162017] border border-[#273829]"
            : "bg-gradient-to-r from-[#231c29] via-[#33223f] to-[#452857]/80"
        }`}
      />

      {/* Instructional text inside track */}
      <motion.div
        style={{ opacity: isConfirmed ? 0 : textOpacity }}
        className="absolute inset-0 flex items-center justify-center pl-8 pr-3 pointer-events-none text-[11px] font-medium text-[#968a9c] truncate tracking-tight"
      >
        <span className="truncate">Deslize: {label}</span>
      </motion.div>

      {/* Confirmed / processing status display */}
      {isConfirmed && (
        <div className="absolute inset-0 flex items-center justify-center gap-1.5 text-xs font-medium text-[#9fc193] pointer-events-none animate-in fade-in duration-150">
          {isProcessing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9fc193]" />
              <span>Avançando etapa...</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5 text-[#9fc193]" />
              <span>Etapa confirmada!</span>
            </>
          )}
        </div>
      )}

      {/* Draggable handle */}
      <motion.div
        drag={!isConfirmed && !disabled ? "x" : false}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0.05}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x }}
        whileHover={!isConfirmed ? { scale: 1.05 } : {}}
        whileTap={!isConfirmed ? { scale: 0.98 } : {}}
        className={`relative z-10 flex items-center justify-center w-[34px] h-[30px] rounded-lg cursor-grab active:cursor-grabbing shadow-md transition-colors ${
          isConfirmed
            ? "bg-[#1e2e20] border border-[#3b593d] text-[#9fc193]"
            : "bg-[#281f30] hover:bg-[#342740] border border-[#4a3857] text-[#bba0c1]"
        }`}
        title="Deslize para a direita para confirmar"
      >
        {isConfirmed ? (
          <Check className="w-4 h-4 text-[#9fc193]" />
        ) : (
          <ChevronsRight className="w-4 h-4 text-[#bba0c1]" />
        )}
      </motion.div>
    </div>
  );
}
