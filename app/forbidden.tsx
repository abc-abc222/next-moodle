import type { Metadata } from "next";

import {
  BackStateLink,
  DashboardStateLink,
  SystemState,
} from "@/components/app-shell/system-state";

export const metadata: Metadata = {
  title: "アクセス禁止",
  description: "このアカウントでは要求された情報を表示できません。",
};

export default function ForbiddenPage() {
  return (
    <main className="ui-system-page grid min-h-dvh place-items-center bg-[var(--surface-canvas)] p-5 sm:p-8">
      <SystemState
        actions={<><BackStateLink /><DashboardStateLink /></>}
        description="このアカウントには、要求された情報を表示する権限がありません。受講登録、公開条件、またはMoodleの権限設定を確認してください。"
        kind="forbidden"
        title="アクセスは禁止されています"
      />
    </main>
  );
}
