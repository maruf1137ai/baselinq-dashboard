import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border_color: "#EAEAEA",
        black1: "#121212",
        black2: "#4B4B4B",
        black3: "#0F172A",
        black4: "#111827",
        gray1: "#8B8B8B",
        // Legacy secondary-text aliases. gray2 (#6B6B6B) was a dead-neutral
        // grey and gray3 (#6F7372) a faintly GREEN grey (hue 165) — both sat
        // outside the hue-220 neutral ramp while doing the same job as
        // --muted-foreground. Repointed at the token rather than rewriting
        // the ~30 call sites, so secondary text is one colour everywhere.
        gray2: "hsl(var(--muted-foreground))",
        gray3: "hsl(var(--muted-foreground))",
        gray4: "#6B7280",
        purple: "#6c5ce7",
        green_dark: "#10B981",
        green_light: "#BBF7D0",
        red_dark: "#EF4444",
        red_light: "#FECACA",
        orange_dark: "#F97316",
        orange_light: "#FED7AA",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          // --primary is the exact HSL of the previous #6c5ce7 literal, so
          // this is a zero-pixel change today. It also means a rebrand is
          // one CSS variable rather than a find-and-replace.
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          // These three were hardcoded literals, which orphaned the
          // --sidebar-* variables entirely. Values below are the exact HSL
          // equivalents, so appearance is unchanged.
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-background))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        // The whole scale derives from --radius. Previously only sm/md/lg
        // did, while xl (282 uses) and 2xl (50 uses) fell through to
        // Tailwind's defaults of 12px/16px — so the radius token only
        // controlled part of the app and cards were always rounder than
        // buttons by accident rather than by intent.
        sm: "calc(var(--radius) - 3px)",   // 3px — inline chips, small tags
        md: "calc(var(--radius) - 2px)",   // 4px — badges, inputs, menu items
        lg: "var(--radius)",               // 6px — buttons, form controls
        xl: "calc(var(--radius) + 2px)",   // 8px — cards, panels, wells
        "2xl": "calc(var(--radius) + 6px)", // 12px — modals, drawers, hero
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
