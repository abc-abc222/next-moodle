import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { loadMoodleSession } from "@/lib/auth/server";
import { readCommandCourses } from "@/lib/moodle/queries/courses";

export default async function CockpitLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await loadMoodleSession();
  if (session === null) {
    redirect("/login?reason=expired");
  }
  const courseResult = session.manifest.features.courses === "available"
    ? await readCommandCourses(session.userId)
    : null;
  const courses = courseResult?.kind === "ready" ? courseResult.data : [];
  const config = readAppRuntimeConfig();
  return (
    <AppShell
      appName={config.appName}
      courses={courses}
      siteName={session.site.siteName}
    >
      {children}
    </AppShell>
  );
}
