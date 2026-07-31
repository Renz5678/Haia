import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-container": "#eeeeec",
        "secondary-container": "#feae2c",
        "on-primary-fixed": "#0f0069",
        "surface-dim": "#dadad8",
        "on-primary-container": "#dad7ff",
        "on-surface": "#1a1c1b",
        "error": "#ba1a1a",
        "outline-variant": "#c7c4d8",
        "on-secondary": "#ffffff",
        "tertiary": "#7e3000",
        "primary-container": "#4f46e5",
        "tertiary-fixed-dim": "#ffb695",
        "on-background": "#1a1c1b",
        "inverse-surface": "#2f3130",
        "error-container": "#ffdad6",
        "secondary-fixed": "#ffddb4",
        "surface-container-low": "#f4f4f2",
        "on-primary-fixed-variant": "#3323cc",
        "on-error": "#ffffff",
        "tertiary-fixed": "#ffdbcc",
        "on-surface-variant": "#464555",
        "outline": "#777587",
        "inverse-on-surface": "#f1f1ef",
        "primary-fixed-dim": "#c3c0ff",
        "indigo-deep": "#4F46E5",
        "secondary": "#835500",
        "surface": "#f9f9f7",
        "surface-variant": "#e2e3e1",
        "xp-gold": "#F5A623",
        "on-tertiary-fixed": "#351000",
        "primary": "#3525cd",
        "surface-tint": "#4d44e3",
        "background": "#f9f9f7",
        "secondary-fixed-dim": "#ffb955",
        "surface-container-lowest": "#ffffff",
        "on-tertiary-container": "#ffd2be",
        "surface-container-high": "#e8e8e6",
        "on-tertiary": "#ffffff",
        "on-error-container": "#93000a",
        "on-secondary-container": "#6b4500",
        "surface-container-highest": "#e2e3e1",
        "primary-fixed": "#e2dfff",
        "on-primary": "#ffffff",
        "on-secondary-fixed-variant": "#633f00",
        "surface-bright": "#f9f9f7",
        "border-hairline": "#E5E5E2",
        "on-secondary-fixed": "#291800",
        "tertiary-container": "#a44100",
        "inverse-primary": "#c3c0ff",
        "surface-muted": "#EDEDEA",
        "on-tertiary-fixed-variant": "#7b2f00"
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px"
      },
      spacing: {
        "sidebar-width": "64px",
        "max-width-content": "1100px",
        "sidebar-expanded": "240px",
        "gutter": "24px",
        "unit": "4px",
        "margin-mobile": "16px",
        "margin-desktop": "48px"
      },
      fontFamily: {
        "label-xp": ["var(--font-hanken-grotesk)"],
        "label-caps": ["var(--font-inter)"],
        "body-md": ["var(--font-inter)"],
        "headline-md": ["var(--font-hanken-grotesk)"],
        "headline-lg-mobile": ["var(--font-hanken-grotesk)"],
        "headline-lg": ["var(--font-hanken-grotesk)"],
        "body-lg": ["var(--font-inter)"],
        "display-hero": ["var(--font-anton)"],
        "anton": ["var(--font-anton)"]
      },
      fontSize: {
        "label-xp": ["14px", { lineHeight: "1.0", fontWeight: "700" }],
        "label-caps": ["12px", { lineHeight: "1.0", letterSpacing: "0.05em", fontWeight: "600" }],
        "body-md": ["15px", { lineHeight: "1.5", fontWeight: "400" }],
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "headline-lg-mobile": ["32px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["40px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "display-hero": ["84px", { lineHeight: "1.0", letterSpacing: "-0.02em", fontWeight: "400" }]
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out-down": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(10px)" },
        },
        "comic-shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        }
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s ease-out forwards",
        "fade-out-down": "fade-out-down 0.3s ease-in forwards",
        "comic-shimmer": "comic-shimmer 2.5s infinite linear",
      }
    },
  },
  plugins: [],
};
export default config;
