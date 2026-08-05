import { ArrowRight, File, Info } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Card, DataList, DataListItem, EmptyState } from "@/components/ui";
import { InspectorSheet } from "@/components/app-shell/inspector-sheet";
import { ContextPanel } from "@/components/app-shell/context-panel";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import type { AppRuntimeConfig } from "@/lib/app-config";
import type { ReactNode } from "react";
import type { StudentAreaData } from "@/lib/moodle/queries/student";
import { StudentAreaNavigation } from "./student-area-navigation";

export function StudentAreaView({ actions, config, data, description, empty, title }: Readonly<{
  actions?: ReactNode;
  config: AppRuntimeConfig;
  data: StudentAreaData;
  description: string;
  empty: string;
  title: string;
}>) {
  const dateFormat = new Intl.DateTimeFormat(config.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: config.timeZone,
  });
  return (
    <PageFrame
      content={data.rows.length === 0 ? <EmptyState title={empty}><p>Moodleに情報が追加されると、ここへ反映されます。</p></EmptyState> : (
        <Card padding="standard"><DataList className="ui-student-ledger" label={`${title}の内容`}>
          {data.rows.map((row) => (
            <DataListItem action={row.href === undefined ? undefined : <Link className="inline-flex min-h-11 items-center gap-1 rounded-[var(--shape-control)] px-3 text-sm font-semibold text-[var(--text-primary)] no-underline hover:bg-[var(--surface-inset)]" href={row.href}>開く <ArrowRight aria-hidden size={15} /></Link>} description={row.meta} icon={<File aria-hidden size={18} />} key={row.id} metadata={row.timestamp === undefined ? undefined : <time dateTime={new Date(row.timestamp * 1_000).toISOString()}>{dateFormat.format(new Date(row.timestamp * 1_000))}</time>} state={row.value === undefined ? undefined : <span className="ui-student-row-value text-sm font-semibold tabular-nums">{row.value}</span>} title={row.title} />
          ))}
        </DataList></Card>
      )}
      context={<ContextPanel storageKey="student" title="学習情報"><StudentAreaNavigation /></ContextPanel>}
      header={<RouteHeader actions={<>{actions}<InspectorSheet label={<><Info aria-hidden size={17} />概要</>} title="概要"><div className="ui-student-overview grid gap-3"><strong className="ui-tabular text-3xl font-semibold">{data.metric}</strong><p className="m-0 text-sm leading-6 text-[var(--text-secondary)]">ログイン中のMoodleアカウントから取得しています。</p></div></InspectorSheet></>} description={description} eyebrow="STUDENT RECORD" metadata={data.metric} title={title} />}
      mode="browse"
      width="standard"
    />
  );
}
