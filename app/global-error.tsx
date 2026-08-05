"use client";

import { ArrowClockwise } from "@phosphor-icons/react";
import { useEffect } from "react";

import {
  DashboardStateLink,
  SystemState,
} from "@/components/app-shell/system-state";
import { Button } from "@/components/ui";
import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry: retry,
}: Readonly<{
  error: Error & { digest?: string };
  unstable_retry: () => void;
}>) {
  useEffect(() => {
    console.error("Global rendering error", { digest: error.digest });
  }, [error.digest]);

  return (
    <html lang="ja">
      <body>
        <title>エラー · next-moodle</title>
        <main className="ui-system-page grid min-h-dvh place-items-center bg-[var(--surface-canvas)] p-5 sm:p-8">
          <SystemState
            actions={<><Button icon={<ArrowClockwise aria-hidden size={17} />} onClick={retry}>もう一度試す</Button><DashboardStateLink /></>}
            description="安全な状態を保ったまま処理を停止しました。再試行しても続く場合は、問い合わせ番号を管理者へ共有してください。"
            kind="error"
              {...(error.digest === undefined ? {} : { reference: error.digest })}
            title="問題が発生しました"
          />
        </main>
      </body>
    </html>
  );
}
