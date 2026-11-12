/**
 * The soft warm look (CLAUDE.md "Look"), drawn with react-native-svg: the fixed
 * peach and butter wash behind every screen, and gradient fills for tappable
 * tiles and the hero card. No blur library: cards are translucent instead.
 */
import { useId } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { colors } from "@/theme";

/** One glow of the wash: centre and radii in points, like the website's `radial-gradient(rx ry at x y, color, transparent fade)`. */
type Glow = { cx: number; cy: number; rx: number; ry: number; color: string; opacity: number; fade: number };

/**
 * The website's body::before wash (globals.css), on the phone's screen size: peach top-left, butter top-right,
 * a soft apricot glow at the bottom, over warm white. It sits behind the scroll view, so it stays put.
 */
export function Wash() {
  const { width, height } = useWindowDimensions();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const glows: Glow[] = [
    { cx: width * 0.5, cy: height * 1.15, rx: 896, ry: 544, color: "#FFE1C4", opacity: 0.55, fade: 0.65 },
    { cx: width * 1.1, cy: height * -0.06, rx: 768, ry: 480, color: colors.butter, opacity: 0.7, fade: 0.6 },
    { cx: width * -0.1, cy: height * -0.12, rx: 960, ry: 576, color: colors.peach, opacity: 0.75, fade: 0.6 },
  ];
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.page }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height}>
        <Defs>
          {glows.map((g, i) => (
            <RadialGradient key={i} id={`${id}g${i}`} gradientUnits="userSpaceOnUse" cx={g.cx} cy={g.cy} fx={g.cx} fy={g.cy} rx={g.rx} ry={g.ry}>
              <Stop offset={0} stopColor={g.color} stopOpacity={g.opacity} />
              <Stop offset={g.fade} stopColor={g.color} stopOpacity={0} />
              <Stop offset={1} stopColor={g.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {glows.map((_, i) => (
          <Rect key={i} x={0} y={0} width={width} height={height} fill={`url(#${id}g${i})`} />
        ))}
      </Svg>
    </View>
  );
}

/**
 * A rounded gradient that fills its parent (put it first inside a View with the same corner radius).
 * "down" runs top to bottom; "diagonal" runs top-left to bottom-right.
 */
export function GradientFill({ stops, radius, direction = "down" }: {
  stops: readonly { color: string; opacity?: number }[];
  radius: number;
  direction?: "down" | "diagonal";
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const end = direction === "down" ? { x2: "0", y2: "1" } : { x2: "1", y2: "1" };
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" {...end}>
          {stops.map((st, i) => (
            <Stop key={i} offset={stops.length === 1 ? 0 : i / (stops.length - 1)} stopColor={st.color} stopOpacity={st.opacity ?? 1} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" rx={radius} ry={radius} fill={`url(#${id})`} />
    </Svg>
  );
}

/** Tappable tiles: white fading into cream (the website's `from-white/90 to-cream`). */
export const tileStops = [{ color: colors.white, opacity: 0.9 }, { color: colors.cream }] as const;
/** The small icon square on a tile: butter into peach. */
export const iconStops = [{ color: colors.butter }, { color: colors.peach }] as const;
/** The hero card: butter, peach, apricot. */
export const heroStops = [{ color: colors.butter }, { color: colors.peach }, { color: "#FFC09F" }] as const;
