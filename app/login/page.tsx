import { GraduationCap } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login/login-form";
import { Notice, ThemeControl } from "@/components/ui";
import { loadOptionalMoodleSession } from "@/lib/auth/server";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { MoodleConfigurationError, readMoodleConfig } from "@/lib/moodle/server";

export const metadata: Metadata = {
  title: "ログイン",
  description: "Moodleの学習情報を安全に確認するためのログイン画面です。",
};

type LoginPageProps = Readonly<{
  searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}>;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { appName } = readAppRuntimeConfig();
  let connectionLabel = "接続先が未設定です";
  try {
    connectionLabel = new URL(readMoodleConfig().baseUrl).host;
  } catch (error) {
    if (!(error instanceof MoodleConfigurationError)) {
      throw error;
    }
  }
  const session = await loadOptionalMoodleSession();
  if (session !== null) {
    redirect("/dashboard");
  }
  const params = await searchParams;
  const reason = typeof params["reason"] === "string" ? params["reason"] : undefined;

  return (
    <main className="ui-login-page grid min-h-dvh place-items-center bg-[var(--surface-canvas)] p-3 sm:p-5 lg:p-8">
      <div className="ui-login-workspace grid w-full max-w-5xl min-w-0 overflow-hidden rounded-[var(--shape-sheet)] bg-[var(--surface-primary)] shadow-[var(--shadow-elevated)] md:min-h-[38rem] md:grid-cols-[minmax(0,.9fr)_minmax(24rem,1.1fr)]">
        <section className="ui-login-story grid min-w-0 content-between gap-8 bg-[var(--surface-secondary)] p-5 sm:p-8" aria-labelledby="login-story-title">
          <div className="ui-login-brand flex min-h-11 items-center gap-2 font-semibold text-[var(--text-primary)]">
            <GraduationCap aria-hidden className="text-[var(--accent-500)]" size={26} weight="regular" />
            <span>{appName}</span>
          </div>
          <div className="ui-login-copy grid max-w-lg gap-3">
            <p className="ui-login-kicker m-0 font-mono text-xs font-semibold tracking-[.08em] text-[var(--text-tertiary)]">MOODLE WORKSPACE</p>
            <h1 className="m-0 max-w-[18ch] text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.03] font-bold tracking-[-.045em] text-balance" id="login-story-title">Moodleへ安全に接続</h1>
            <p className="m-0 text-base leading-7 text-[var(--text-secondary)]">コース、締切、課題提出を読みやすい作業画面にまとめます。Moodle本体のデータ構造は変更しません。</p>
          </div>
          <dl className="ui-login-ledger m-0 grid divide-y divide-[var(--border-subtle)]">
            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 py-3"><dt className="font-mono text-xs text-[var(--text-tertiary)]">接続先</dt><dd className="m-0 break-words text-sm text-[var(--text-secondary)]">{connectionLabel}</dd></div>
            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 py-3"><dt className="font-mono text-xs text-[var(--text-tertiary)]">認証情報</dt><dd className="m-0 text-sm text-[var(--text-secondary)]">ログイン時だけ使用し、保存しません</dd></div>
            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 py-3"><dt className="font-mono text-xs text-[var(--text-tertiary)]">セッション</dt><dd className="m-0 text-sm text-[var(--text-secondary)]">暗号化されたHttpOnly Cookieで8時間保護</dd></div>
          </dl>
        </section>
        <section className="ui-login-panel grid min-w-0 items-center p-5 sm:p-8" aria-labelledby="login-title">
          <div className="ui-login-panel__inner mx-auto grid w-full max-w-sm gap-6">
            <div className="ui-login-theme justify-self-end"><ThemeControl /></div>
            <header className="ui-login-panel__header grid gap-2">
              <h2 className="m-0 text-xl font-semibold" id="login-title">認証情報</h2>
              <p className="m-0 text-sm leading-6 text-[var(--text-secondary)]">Moodleで使用しているユーザー名とパスワードを入力してください。</p>
            </header>
            {reason === "expired" ? (
              <Notice title="セッションが終了しました" tone="warning">
                <p>安全のため、もう一度ログインしてください。</p>
              </Notice>
            ) : null}
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
