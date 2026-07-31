import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Playwright's development server independent from a developer's
  // existing `next dev` process in the same checkout.
  distDir: process.env.NEXT_MOODLE_E2E === "1" ? ".next-e2e" : ".next",
  experimental: {
    authInterrupts: true,
    viewTransition: true,
  },
};

export default nextConfig;
