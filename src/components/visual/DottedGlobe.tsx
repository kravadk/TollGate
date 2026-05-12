import type { ComponentProps } from "react";
import { GlobePulse, type PulseMarker } from "./GlobePulse";

const defaultHeroMarkers: PulseMarker[] = [
  { id: "ap-london", location: [51.5072, -0.1276], delay: 0 },
  { id: "ap-newyork", location: [40.7128, -74.006], delay: 0.45 },
  { id: "ap-singapore", location: [1.3521, 103.8198], delay: 0.9 },
  { id: "ap-mumbai", location: [19.076, 72.8777], delay: 1.35 },
  { id: "ap-sf", location: [37.7749, -122.4194], delay: 1.8 },
  { id: "ap-dubai", location: [25.2048, 55.2708], delay: 2.25 },
  { id: "ap-tokyo", location: [35.6895, 139.6917], delay: 2.7 },
  { id: "ap-berlin", location: [52.52, 13.405], delay: 3.15 },
];

type DottedGlobeProps = {
  className?: string;
  globeClassName?: ComponentProps<typeof GlobePulse>["className"];
  markers?: PulseMarker[];
  markerCss?: string;
  markerColor?: [number, number, number];
  haloCss?: string;
};

export function DottedGlobe({
  className = "",
  globeClassName = "",
  markers = defaultHeroMarkers,
  markerCss = "#b7fc72",
  markerColor = [0.72, 0.99, 0.45],
  haloCss = "rgba(183, 252, 114, 0.08)",
}: DottedGlobeProps) {
  return (
    <div className={`relative mx-auto aspect-square w-full max-w-[360px] sm:max-w-[500px] md:max-w-[620px] lg:max-w-[760px] ${className}`}>
      <div
        className="absolute inset-[14%] rounded-full blur-[110px] md:blur-[150px]"
        style={{ background: haloCss }}
      />
      <div
        className="absolute inset-[11%] rounded-full blur-[80px] md:blur-[100px]"
        style={{ background: haloCss, opacity: 0.6 }}
      />
      <div className="pointer-events-none absolute inset-[12%] rounded-full">
        <GlobePulse
          className={`h-full w-full opacity-85 ${globeClassName}`}
          markers={markers}
          speed={0.0024}
          markerCss={markerCss}
          markerColor={markerColor}
        />
      </div>
    </div>
  );
}
