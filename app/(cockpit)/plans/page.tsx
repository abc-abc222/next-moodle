import type { Metadata } from "next";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { StudentAreaView } from "@/components/student/student-area-view";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { requireMoodleSession } from "@/lib/auth/server";
import { readPlans } from "@/lib/moodle/queries/student";

export const metadata: Metadata = { title: "学習プラン" };

export default async function PlansPage() {
  const session = await requireMoodleSession();
  if (session.manifest.features.plans !== "available") {
    const sourceUrl = new URL("admin/tool/lp/plans.php", `${session.site.siteUrl}/`);
    sourceUrl.searchParams.set("userid", String(session.userId));
    return <StudentAreaView actions={<a className="ui-app-action-link" href={sourceUrl.toString()} rel="noopener noreferrer" target="_blank">Moodleで学習プランを確認</a>} config={readAppRuntimeConfig()} data={{ metric: "利用不可", rows: [{ id: "capability", meta: "未許可のWeb Service", title: "core_competency_list_user_plans" }] }} description="この Moodle サービスでは学習プラン API が学生に許可されていません。接続障害ではなく、管理者側のサービス設定です。" empty="利用可能な学習プランはありません" title="学習プラン" />;
  }
  const result = await readPlans(session.userId);
  return result.kind === "failure"
    ? <StateNotice reason={resolveMoodlePageFailure(result.reason)} retryHref="/plans" siteUrl={session.site.siteUrl} />
    : <StudentAreaView config={readAppRuntimeConfig()} data={result.data} description="コンピテンシーと学習目標の進行状況です。" empty="学習プランはありません" title="学習プラン" />;
}
