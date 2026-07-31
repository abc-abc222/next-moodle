import type { Metadata } from "next";

import { StudentAreaView } from "@/components/student/student-area-view";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { requireMoodleSession } from "@/lib/auth/server";
import { missingRequiredStudentFunctions } from "@/lib/moodle/capabilities";
import { readCourseAdapterDiagnostics } from "@/lib/moodle/queries/courses";
import { studentSupportCatalog } from "@/lib/moodle/support-catalog";

export const metadata: Metadata = { title: "接続診断" };

export default async function DiagnosticsPage() {
  const session = await requireMoodleSession();
  const missing = missingRequiredStudentFunctions(session.manifest);
  const adapterDiagnostics = await readCourseAdapterDiagnostics(session.userId, session.manifest);
  const unresolved = adapterDiagnostics.kind === "ready" ? adapterDiagnostics.data : [];
  const catalog = studentSupportCatalog(session.manifest);
  const deliveryCounts = catalog.reduce(
    (counts, entry) => ({ ...counts, [entry.delivery]: counts[entry.delivery] + 1 }),
    { adapter: 0, native: 0, runtime: 0, unavailable: 0 },
  );
  const replacementReady = session.manifest.replacementReady && missing.length === 0 &&
    adapterDiagnostics.kind === "ready" && unresolved.length === 0;
  const rows = [
    { id: "release", meta: "Moodleバージョン", title: session.manifest.moodleRelease },
    { id: "contract", meta: "local_nextmoodle", title: session.manifest.companion.contractVersion === 2 ? "契約v2 接続済み" : "契約v2が必要" },
    { id: "catalog", meta: `対応カタログ v${session.manifest.version}`, title: `native ${deliveryCounts.native} / adapter ${deliveryCounts.adapter} / runtime ${deliveryCounts.runtime} / 未対応 ${deliveryCounts.unavailable}` },
    { id: "readiness", meta: "完全置換 readiness", title: replacementReady ? "公開活動をすべて解決済み" : "未完了の接続項目があります" },
    { id: "adapters", meta: "補助アダプター", title: session.manifest.companionModules.length === 0 ? "登録なし" : session.manifest.companionModules.join(", ") },
    { id: "unresolved", meta: "未解決活動（種別のみ）", title: adapterDiagnostics.kind === "failure" ? "活動の検査に失敗" : unresolved.length === 0 ? "なし" : unresolved.map((item) => `${item.moduleType} × ${item.count}`).join(", ") },
    { id: "files", meta: "ファイル境界", title: `download ${session.manifest.fileAccess.download ? "on" : "off"} / upload ${session.manifest.fileAccess.upload ? "on" : "off"}` },
    { id: "functions", meta: `未許可関数 ${missing.length}件`, title: missing.length === 0 ? "必須関数を確認済み" : missing.join(", ") },
    { id: "fingerprint", meta: "関数契約fingerprint", title: session.manifest.functionHash.slice(0, 16) },
  ];
  return <StudentAreaView config={readAppRuntimeConfig()} data={{ metric: replacementReady ? "Ready" : `${missing.length + unresolved.length} unresolved`, rows }} description="学生データ、氏名、トークン、本文を表示せず、接続契約と活動種別だけを確認します。" empty="診断項目はありません" title="接続診断" />;
}
