import type { NextConfig } from "next";

// Keep the runtime flag while remaining compatible with Next.js type packages
// that shipped before `viewTransition` was added to ExperimentalConfig.
const experimental = {
  authInterrupts: true,
  viewTransition: true,
} satisfies NonNullable<NextConfig["experimental"]> & {
  viewTransition?: boolean;
};

const nextConfig: NextConfig = {
  // Keep Playwright's development server independent from a developer's
  // existing `next dev` process in the same checkout.
  distDir: process.env.NEXT_MOODLE_E2E === "1" ? ".next-e2e" : ".next",
  experimental,
};

export default nextConfig;
