/**
 * All brand image references for the phone app live here, so the raster
 * (AI-generated) images can be swapped for traced SVGs later in one place.
 * Copies of apps/web/public/brand/ (see apps/web/src/lib/brand.ts).
 */
import type { ImageSourcePropType } from "react-native";

type BrandImage = { source: ImageSourcePropType; width: number; height: number; alt: string };

export const brandImages = {
  /** Lantern mark + "Lanternway" wordmark. */
  logoLockup: { source: require("../../assets/brand/logo-lockup.png"), width: 769, height: 276, alt: "Lanternway" },
  /** Lantern mark only, for tight spaces. */
  logoMark: { source: require("../../assets/brand/logo-mark.png"), width: 240, height: 276, alt: "Lanternway" },
  /** Lumi, head only. Use at small sizes. */
  lumiHead: { source: require("../../assets/brand/lumi-head.png"), width: 219, height: 248, alt: "Lumi from Lanternway" },
  /** Lumi peeking out of the lantern. Use for welcome/onboarding. */
  lumiPeeking: {
    source: require("../../assets/brand/lumi-peeking.png"),
    width: 294,
    height: 523,
    alt: "Lumi from Lanternway, peeking out of the lantern",
  },
} satisfies Record<string, BrandImage>;
