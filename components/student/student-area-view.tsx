import { ArrowRight, File, Info } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Notice } from "@/components/ui";
import { InspectorSheet } from "@/components/app-shell/inspector-sheet";
import { ContextPanel } from "@/components/app-shell/context-panel";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import type { AppRuntimeConfig } from "@/lib/app-config";
import type { ReactNode } from "react";
import type { StudentAreaData } from "@/lib/moodle/queries/student";
import { StudentAreaNavigation } from "./student-area-navigation";
import "./student.css";

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
      content={data.rows.length === 0 ? (
        <Notice title={empty} tone="info"><p>Moodleに情報が追加されると、ここへ反映されます。</p></Notice>
      ) : (
        <ul className="ui-student-ledger ui-ledger" aria-label={`${title}の内容`}>
          {data.rows.map((row) => (
            <li key={row.id}>
              <File aria-hidden size={18} />
              <span><strong>{row.title}</strong><small>{row.meta}</small></span>
              {row.timestamp === undefined ? null : <time dateTime={new Date(row.timestamp * 1_000).toISOString()}>{dateFormat.format(new Date(row.timestamp * 1_000))}</time>}
              {row.value === undefined ? null : <span className="ui-student-row-value">{row.value}</span>}
              {row.href === undefined ? null : <Link href={row.href}>開く <ArrowRight aria-hidden size={15} /></Link>}
            </li>
          ))}
        </ul>
      )}
      context={<ContextPanel storageKey="student" title="学習情報"><StudentAreaNavigation /></ContextPanel>}
      header={<RouteHeader actions={<>{actions}<InspectorSheet label={<><Info aria-hidden size={17} />概要</>} title="概要"><div className="ui-student-overview"><strong className="ui-tabular">{data.metric}</strong><p>ログイン中のMoodleアカウントから取得しています。</p></div></InspectorSheet></>} description={description} eyebrow="STUDENT RECORD" metadata={data.metric} title={title} />}
      mode="browse"
    />
  );
}
