import type { Metadata } from "next";

import {
  BackStateLink,
  DashboardStateLink,
  SystemState,
} from "@/components/app-shell/system-state";

export const metadata: Metadata = {
  title: "ページが見つかりません",
  description: "要求されたページまたは学習情報は見つかりませんでした。",
};

export default function NotFoundPage() {
  return (
    <main className="ui-system-page grid min-h-dvh place-items-center bg-[var(--surface-canvas)] p-5 sm:p-8">
      <SystemState
        actions={<><BackStateLink /><DashboardStateLink /></>}
        description="URLが正しくないか、このアカウントで利用できる一覧に対象がありません。コース一覧からもう一度選択してください。"
        kind="not-found"
        title="ページが見つかりません"
      />
    </main>
  );
}
