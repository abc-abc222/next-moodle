import { Notice } from "@/components/ui";
import type { MoodleResponseDiagnostic } from "@/lib/moodle/errors";
import { dispositionForMoodlePageFailure } from "@/lib/moodle/page-failure";
import type { MoodleReadFailureReason } from "@/lib/moodle/queries/dashboard";
import Link from "next/link";
import { forbidden } from "next/navigation";

import { ReauthenticateButton } from "./logout-button";

type StateNoticeProps = Readonly<{
  diagnostic?: MoodleResponseDiagnostic;
  reason: Exclude<MoodleReadFailureReason, "permission">;
  retryHref: string;
  siteUrl: string;
}>;

export function resolveMoodlePageFailure(
  reason: MoodleReadFailureReason,
): StateNoticeProps["reason"] {
  const disposition = dispositionForMoodlePageFailure(reason);
  switch (disposition) {
    case "reauthenticate": return "auth_expired";
    case "capability": return "capability";
    case "forbidden":
      forbidden();
    case "recoverable":
      if (reason === "invalid_response" || reason === "outage") {
        return reason;
      }
      throw new Error("Unexpected Moodle page failure disposition.");
  }
}

function diagnosticHref(diagnostic: MoodleResponseDiagnostic | undefined): string {
  if (diagnostic?.functionName === undefined) return "/diagnostics";
  const params = new URLSearchParams({
    at: String(diagnostic.occurredAt),
    function: diagnostic.functionName,
    phase: diagnostic.phase,
  });
  return `/diagnostics?${params.toString()}`;
}

function SafeDiagnostic({ diagnostic }: Readonly<{ diagnostic: MoodleResponseDiagnostic | undefined }>) {
  if (diagnostic === undefined) return null;
  return (
    <details>
      <summary>安全な診断情報を表示</summary>
      <p>{diagnostic.functionName ?? "Moodle応答"} / {diagnostic.phase}</p>
      {diagnostic.issues.length === 0 ? null : (
        <ul>{diagnostic.issues.map((issue, index) => (
          <li key={`${issue.path}-${issue.code}-${index}`}>{issue.path}: {issue.code}{issue.expected === undefined ? "" : ` / expected ${issue.expected}`}{issue.received === undefined ? "" : ` / received ${issue.received}`}</li>
        ))}</ul>
      )}
    </details>
  );
}

export function StateNotice({ diagnostic, reason, retryHref }: StateNoticeProps) {
  if (reason === "auth_expired") {
    return (
      <Notice
        action={<ReauthenticateButton />}
        title="Moodleの認証期限が切れました"
        tone="warning"
      >
        <p>安全のため、もう一度ログインしてから学習を続けてください。</p>
      </Notice>
    );
  }
  if (reason === "outage") {
    return (
      <Notice
        action={<Link className="ui-app-action-link" href={retryHref}>再試行</Link>}
        title="Moodleに接続できません"
        tone="warning"
      >
        <p>一時的にMoodleから応答を取得できませんでした。少し待ってからもう一度お試しください。</p>
      </Notice>
    );
  }
  if (reason === "invalid_response") {
    return (
      <Notice
        action={<><Link className="ui-app-action-link" href={retryHref}>再試行</Link><Link className="ui-app-action-link" href={diagnosticHref(diagnostic)}>接続診断を確認</Link></>}
        title="Moodleの応答を読み取れません"
        tone="warning"
      >
        <p>この画面に必要な情報の形式がMoodle側と一致していません。再試行しても続く場合は、接続診断の結果をMoodle管理者へ共有してください。</p>
        <SafeDiagnostic diagnostic={diagnostic} />
      </Notice>
    );
  }
  return (
    <Notice
      action={<><Link className="ui-app-action-link" href={retryHref}>再試行</Link><Link className="ui-app-action-link" href="/diagnostics">接続診断を確認</Link></>}
      title="必要なMoodle機能を利用できません"
      tone="info"
    >
      <p>この画面に必要な標準APIまたはHTML画面を利用できません。接続診断の不足項目をMoodle管理者へ共有してください。</p>
    </Notice>
  );
}
