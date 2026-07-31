import type { Metadata } from "next";

import { StudentAreaView } from "@/components/student/student-area-view";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { requireMoodleSession } from "@/lib/auth/server";
import { missingRequiredStudentFunctions } from "@/lib/moodle/capabilities";
import { MOODLE_DIAGNOSTIC_PHASES } from "@/lib/moodle/errors";
import { MoodleFunctionNameSchema } from "@/lib/moodle/functions";
import { readCourseSupportDiagnostics } from "@/lib/moodle/queries/courses";
import { studentSupportCatalog } from "@/lib/moodle/support-catalog";

export const metadata: Metadata = { title: "接続診断" };

type DiagnosticsPageProps = Readonly<{
  searchParams: Promise<{ at?: string; function?: string; phase?: string }>;
}>;

export default async function DiagnosticsPage({ searchParams }: DiagnosticsPageProps) {
  const session = await requireMoodleSession();
  const query = await searchParams;
  const functionName = MoodleFunctionNameSchema.safeParse(query.function);
  const phase = MOODLE_DIAGNOSTIC_PHASES.includes(query.phase as typeof MOODLE_DIAGNOSTIC_PHASES[number])
    ? query.phase
    : undefined;
  const occurredAt = Number(query.at);
  const missing = missingRequiredStudentFunctions(session.manifest);
  const supportDiagnostics = await readCourseSupportDiagnostics(session.userId);
  const unresolved = supportDiagnostics.kind === "ready" ? supportDiagnostics.data : [];
  const catalog = studentSupportCatalog(session.manifest);
  const deliveryCounts = catalog.reduce(
    (counts, entry) => ({ ...counts, [entry.delivery]: counts[entry.delivery] + 1 }),
    { api: 0, html: 0 },
  );
  const replacementReady = supportDiagnostics.kind === "ready" && unresolved.length === 0;
  const rows = [
    ...(functionName.success && phase !== undefined ? [{
      id: "last-response",
      meta: `直近の応答診断${Number.isSafeInteger(occurredAt) ? ` · ${new Date(occurredAt).toLocaleString("ja-JP")}` : ""}`,
      title: `${functionName.data} / ${phase}`,
    }] : []),
    { id: "release", meta: "Moodleバージョン", title: session.manifest.moodleRelease },
    { id: "catalog", meta: `対応カタログ v${session.manifest.version}`, title: `API ${deliveryCounts.api} / HTML ${deliveryCounts.html}` },
    { id: "readiness", meta: "完全置換 readiness", title: replacementReady ? "公開活動をすべて解決済み" : "未完了の接続項目があります" },
    { id: "unresolved", meta: "未解決活動（種別のみ）", title: supportDiagnostics.kind === "failure" ? "活動の検査に失敗" : unresolved.length === 0 ? "なし" : unresolved.map((item) => `${item.moduleType} × ${item.count}`).join(", ") },
    { id: "files", meta: "ファイル境界", title: `download ${session.manifest.fileAccess.download ? "on" : "off"} / upload ${session.manifest.fileAccess.upload ? "on" : "off"}` },
    { id: "functions", meta: `HTML補完対象 ${missing.length}件`, title: missing.length === 0 ? "必要な標準APIを確認済み" : "未許可の操作は認証済みHTML画面で補完" },
    { id: "fingerprint", meta: "関数契約fingerprint", title: session.manifest.functionHash.slice(0, 16) },
  ];
  return <StudentAreaView config={readAppRuntimeConfig()} data={{ metric: replacementReady ? "Ready" : `${unresolved.length} unresolved`, rows }} description="学生データ、氏名、トークン、本文を表示せず、接続契約と活動種別だけを確認します。" empty="診断項目はありません" title="接続診断" />;
}
