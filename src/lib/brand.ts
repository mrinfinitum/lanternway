/**
 * All brand image references live here so the raster (AI-generated) images
 * can be swapped for traced SVGs later in one place.
 *
 * The individual PNGs were cropped from brand/brand-sheet-final.webp and have
 * transparent backgrounds (except the app icon, which keeps its cream square).
 * The favicon is src/app/icon.png (Lumi head-only), per Next.js file convention.
 */

type BrandImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export const brandImages = {
  /** Lantern mark + "Lanternway" wordmark. */
  logoLockup: {
    src: "/brand/logo-lockup.png",
    width: 769,
    height: 276,
    alt: "Lanternway",
  },
  /** Lantern mark only, for tight spaces. */
  logoMark: {
    src: "/brand/logo-mark.png",
    width: 240,
    height: 276,
    alt: "Lanternway",
  },
  /** Lantern on a cream rounded square. */
  appIcon: {
    src: "/brand/app-icon.png",
    width: 365,
    height: 365,
    alt: "Lanternway app icon",
  },
  /** Lumi, full body. Use for illustrations. */
  lumiFull: {
    src: "/brand/lumi-full.png",
    width: 312,
    height: 513,
    alt: "Lumi from Lanternway",
  },
  /** Lumi, head only. Use at small sizes. */
  lumiHead: {
    src: "/brand/lumi-head.png",
    width: 219,
    height: 248,
    alt: "Lumi from Lanternway",
  },
  /** Lumi peeking out of the lantern. Use for welcome/onboarding. */
  lumiPeeking: {
    src: "/brand/lumi-peeking.png",
    width: 294,
    height: 523,
    alt: "Lumi from Lanternway, peeking out of the lantern",
  },
} satisfies Record<string, BrandImage>;

export type BrandImageName = keyof typeof brandImages;

/** Brand colors, for places Tailwind classes can't reach (e.g. Recharts). */
export const brandColors = {
  amber: "#F7B341",
  coral: "#F4825B",
  teal: "#034251",
  cream: "#F7E7CD",
  paper: "#FDF3E6",
} as const;
