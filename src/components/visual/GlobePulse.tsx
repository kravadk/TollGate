import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import createGlobe from "cobe";
import { cn } from "../../utils/cn";

export interface PulseMarker {
  id: string;
  location: [number, number];
  delay: number;
}

interface GlobePulseProps {
  markers?: PulseMarker[];
  className?: string;
  speed?: number;
  markerColor?: [number, number, number];
  markerCss?: string;
  baseColor?: [number, number, number];
  glowColor?: [number, number, number];
  dark?: 0 | 1;
}

const defaultMarkers: PulseMarker[] = [
  { id: "pulse-1", location: [51.51, -0.13], delay: 0 },
  { id: "pulse-2", location: [40.71, -74.01], delay: 0.5 },
  { id: "pulse-3", location: [35.68, 139.65], delay: 1 },
  { id: "pulse-4", location: [-33.87, 151.21], delay: 1.5 },
];

type AnchorStyle = CSSProperties & {
  positionAnchor?: string;
};

export function GlobePulse({
  markers = defaultMarkers,
  className,
  speed = 0.003,
  markerColor = [0.72, 0.99, 0.45],
  markerCss = "#b7fc72",
  baseColor = [0.5, 0.5, 0.5],
  glowColor = [0.05, 0.05, 0.05],
  dark = 1,
}: GlobePulseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetOffset = useRef({ phi: 0, theta: 0 });
  const currentOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);

  const handlePointerMove = useCallback((event: PointerEvent | ReactPointerEvent<HTMLCanvasElement>) => {
    if (typeof window === "undefined" || !window.innerWidth || !window.innerHeight) return;
    const normalizedX = event.clientX / window.innerWidth - 0.5;
    const normalizedY = event.clientY / window.innerHeight - 0.5;
    targetOffset.current = {
      phi: normalizedX * 2.45,
      theta: normalizedY * 1.05,
    };
  }, []);

  useEffect(() => {
    const handlePointerLeave = () => {
      targetOffset.current = { phi: 0, theta: 0 };
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("mouseleave", handlePointerLeave, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("mouseleave", handlePointerLeave);
      targetOffset.current = { phi: 0, theta: 0 };
      currentOffset.current = { phi: 0, theta: 0 };
    };
  }, [handlePointerMove]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let globe: ReturnType<typeof createGlobe> | null = null;
    let animationId = 0;
    let revealTimeout = 0;
    let resizeObserver: ResizeObserver | null = null;
    let phi = 0;

    const syncSize = () => {
      const width = canvas.offsetWidth;
      if (!globe || width === 0) return;
      globe.update({ width, height: width });
    };

    const init = () => {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: 0,
        theta: 0.2,
        dark,
        diffuse: 1.5,
        mapSamples: 16000,
        mapBrightness: 10,
        baseColor,
        markerColor,
        glowColor,
        markers: markers.map((marker) => ({
          location: marker.location,
          size: 0.025,
        })),
        opacity: 0.7,
      });

      const animate = () => {
        phi += speed;
        currentOffset.current = {
          phi:
            currentOffset.current.phi +
            (targetOffset.current.phi - currentOffset.current.phi) * 0.12,
          theta:
            currentOffset.current.theta +
            (targetOffset.current.theta - currentOffset.current.theta) * 0.12,
        };
        globe?.update({
          phi: phi + phiOffsetRef.current + currentOffset.current.phi,
          theta: 0.2 + thetaOffsetRef.current + currentOffset.current.theta,
        });
        animationId = window.requestAnimationFrame(animate);
      };

      animate();
      revealTimeout = window.setTimeout(() => {
        if (canvas) canvas.style.opacity = "1";
      }, 30);
    };

    if (canvas.offsetWidth > 0) init();

    resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      if (!globe && entries[0].contentRect.width > 0) {
        init();
        return;
      }
      syncSize();
    });
    resizeObserver.observe(canvas);

    return () => {
      if (animationId) window.cancelAnimationFrame(animationId);
      if (revealTimeout) window.clearTimeout(revealTimeout);
      resizeObserver?.disconnect();
      globe?.destroy();
    };
  }, [markers, speed, markerColor, baseColor, glowColor, dark]);

  return (
    <div className={cn("relative aspect-square select-none", className)}>
      <style>{`@keyframes globe-pulse-expand{0%{transform:scaleX(0.3) scaleY(0.3);opacity:0.8}100%{transform:scaleX(1.5) scaleY(1.5);opacity:0}}`}</style>
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        style={{
          width: "100%",
          height: "100%",
          cursor: "default",
          opacity: 0,
          transition: "opacity 1.2s ease",
          borderRadius: "50%",
          touchAction: "none",
        }}
      />
      {markers.map((marker) => {
        const markerStyle: AnchorStyle = {
          position: "absolute",
          positionAnchor: `--cobe-${marker.id}`,
          bottom: "anchor(center)" as unknown as string,
          left: "anchor(center)" as unknown as string,
          translate: "-50% 50%",
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          opacity: `var(--cobe-visible-${marker.id}, 0)` as unknown as number,
          filter: `blur(calc((1 - var(--cobe-visible-${marker.id}, 0)) * 8px))`,
          transition: "opacity 0.4s, filter 0.4s",
        };
        return (
          <div key={marker.id} style={markerStyle}>
            <span
              style={{
                position: "absolute",
                inset: 0,
                border: `2px solid ${markerCss}`,
                borderRadius: "50%",
                opacity: 0,
                animation: `globe-pulse-expand 2s ease-out infinite ${marker.delay}s`,
              }}
            />
            <span
              style={{
                position: "absolute",
                inset: 0,
                border: `2px solid ${markerCss}`,
                borderRadius: "50%",
                opacity: 0,
                animation: `globe-pulse-expand 2s ease-out infinite ${marker.delay + 0.5}s`,
              }}
            />
            <span
              style={{
                width: 10,
                height: 10,
                background: markerCss,
                borderRadius: "50%",
                boxShadow: `0 0 0 3px #111, 0 0 0 5px ${markerCss}`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
