"use client";

import { Books, MagnifyingGlass, Star } from "@phosphor-icons/react";
import ky from "ky";
import { useMemo, useState } from "react";

import { SharedTransition, TransitionLink } from "@/components/app-shell/transitions";
import { Badge, Button, Card, EmptyState, Field, Notice, Toolbar } from "@/components/ui";
import type { AppRuntimeConfig } from "@/lib/app-config";
import {
  filterCourseItems,
  type CourseClassification,
  type CourseListItem,
} from "@/lib/moodle/queries/courses-model";

const CLASSIFICATIONS = ["active", "future", "past"] as const;
type CourseFilter = "all" | CourseClassification;
const CLASSIFICATION_COPY: Readonly<
  Record<CourseClassification, Readonly<{ label: string; tone: "success" | "info" | "neutral" }>>
> = {
  active: { label: "受講中", tone: "success" },
  future: { label: "開始前", tone: "info" },
  past: { label: "終了", tone: "neutral" },
};

function coursePeriod(course: CourseListItem, format: Intl.DateTimeFormat): string {
  const start = course.startDate === undefined
    ? "開始日未設定"
    : format.format(new Date(course.startDate * 1_000));
  const end = course.endDate === undefined || course.endDate === 0
    ? "終了日未設定"
    : format.format(new Date(course.endDate * 1_000));
  return `${start} から ${end}`;
}

function initialFavorites(courses: readonly CourseListItem[]): ReadonlySet<number> {
  const ids = new Set<number>();
  for (const course of courses) {
    if (course.isFavourite) ids.add(course.id);
  }
  return ids;
}

export function CourseList({ canFavorite, config, courses }: Readonly<{
  canFavorite: boolean;
  config: AppRuntimeConfig;
  courses: readonly CourseListItem[];
}>) {
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<CourseFilter>("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [favorites, setFavorites] = useState<ReadonlySet<number>>(() => initialFavorites(courses));
  const [pendingFavorite, setPendingFavorite] = useState<number | null>(null);
  const [favoriteError, setFavoriteError] = useState("");
  const filtered = useMemo(() => filterCourseItems(courses, query).filter((course) =>
    (courseFilter === "all" || course.classification === courseFilter) &&
    (!favoriteOnly || favorites.has(course.id)),
  ), [courseFilter, courses, favoriteOnly, favorites, query]);
  const dateFormat = useMemo(() => new Intl.DateTimeFormat(config.locale, {
    dateStyle: "medium", timeZone: config.timeZone,
  }), [config.locale, config.timeZone]);

  async function toggleFavourite(course: CourseListItem): Promise<void> {
    if (!canFavorite || pendingFavorite !== null) return;
    const favourite = !favorites.has(course.id);
    setFavoriteError("");
    setPendingFavorite(course.id);
    const response = await ky.post(`/api/courses/${course.id}/favourite`, { json: { favourite }, retry: 0, throwHttpErrors: false });
    setPendingFavorite(null);
    if (!response.ok) {
      setFavoriteError("スターを更新できませんでした。接続を確認して、もう一度お試しください。");
      return;
    }
    setFavorites((current) => {
      const next = new Set(current);
      if (favourite) next.add(course.id); else next.delete(course.id);
      return next;
    });
  }

  if (courses.length === 0) {
    return (
      <EmptyState icon={<Books aria-hidden size={22} />} title="表示できる受講コースはありません">
        コースへの登録が反映されると、ここに表示されます。
      </EmptyState>
    );
  }

  return (
    <div className="ui-courses-browser grid min-w-0 gap-6">
      <Toolbar label="コースを検索・絞り込み">
        <div className="ui-courses-search grid min-w-[min(100%,20rem)] flex-1 grid-cols-[auto_minmax(0,1fr)] items-end gap-2">
          <span className="grid size-11 shrink-0 place-items-center text-[var(--text-secondary)]"><MagnifyingGlass aria-hidden size={20} weight="regular" /></span>
          <Field
            className="bg-transparent"
            id="course-search"
            label="コースを検索"
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="コース名または略称"
            type="search"
            value={query}
          />
        </div>
        <div className="ui-courses-filters flex max-w-full flex-wrap gap-1 self-end" aria-label="コースの絞り込み" role="group">
          <Button aria-pressed={courseFilter === "all"} className="whitespace-nowrap" onClick={() => setCourseFilter("all")} size="compact" variant={courseFilter === "all" ? "primary" : "ghost"}>すべて</Button>
          {CLASSIFICATIONS.map((classification) => (
            <Button aria-pressed={courseFilter === classification} className="whitespace-nowrap" key={classification} onClick={() => setCourseFilter(classification)} size="compact" variant={courseFilter === classification ? "primary" : "ghost"}>{CLASSIFICATION_COPY[classification].label}</Button>
          ))}
          {canFavorite ? <Button aria-pressed={favoriteOnly} className="whitespace-nowrap" onClick={() => setFavoriteOnly((current) => !current)} size="compact" variant={favoriteOnly ? "primary" : "ghost"}><Star aria-hidden size={15} weight={favoriteOnly ? "fill" : "regular"} />スター付き</Button> : null}
        </div>
      </Toolbar>
      <p aria-live="polite" className="ui-courses-result-count m-0 text-xs text-[var(--text-tertiary)]">{filtered.length}件のコースを表示</p>
      {favoriteError === "" ? null : <Notice title="スターを更新できませんでした" tone="error" urgent><p>{favoriteError}</p></Notice>}
      {filtered.length === 0 ? (
        <EmptyState icon={<MagnifyingGlass aria-hidden size={22} />} title="検索条件に一致するコースはありません">
          コース名または略称を短くして、もう一度検索してください。
        </EmptyState>
      ) : (
        CLASSIFICATIONS.map((classification) => {
          const group = filtered.filter((course) => course.classification === classification);
          if (group.length === 0) {
            return null;
          }
          const copy = CLASSIFICATION_COPY[classification];
          return (
            <Card className="ui-courses-group" key={classification} padding="standard" tone="default">
              <header className="flex min-h-11 items-center justify-between gap-3">
                <h2 className="m-0 text-lg font-semibold">{copy.label}</h2>
                <Badge tone={copy.tone}>{group.length}コース</Badge>
              </header>
              <div className="ui-courses-list mt-2" data-testid={`course-list-${classification}`}>
                <ul className="m-0 list-none divide-y divide-[var(--border-subtle)] p-0">
                  {group.map((course) => (
                    <li className="relative min-w-0" key={course.id}>
                      <div className="ui-courses-row grid min-h-20 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center rounded-[var(--shape-control)] transition-colors duration-[120ms] hover:bg-[var(--surface-elevated)]"><TransitionLink className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-[var(--text-primary)] no-underline max-sm:grid-cols-[auto_minmax(0,1fr)]" href={`/courses/${course.id}`} intent="drill-in">
                        <span className="ui-courses-list__icon grid size-11 shrink-0 place-items-center rounded-[var(--shape-control)] bg-[var(--surface-inset)] text-[var(--text-secondary)]">
                          <Books aria-hidden size={21} weight="regular" />
                        </span>
                        <span className="ui-courses-list__title grid min-w-0 gap-0.5">
                          <SharedTransition identifier={course.id} kind="course"><strong className="truncate">{course.name}</strong></SharedTransition>
                          <small className="truncate text-xs text-[var(--text-tertiary)]">{course.shortName}</small>
                        </span>
                        <span className="ui-courses-list__period pr-2 text-right text-xs text-[var(--text-secondary)] max-sm:col-start-2 max-sm:text-left">{coursePeriod(course, dateFormat)}</span>
                      </TransitionLink>{canFavorite ? <button aria-label={favorites.has(course.id) ? `${course.name}のスターを解除` : `${course.name}にスターを付ける`} aria-pressed={favorites.has(course.id)} className="ui-course-favourite mr-2 grid size-11 shrink-0 place-items-center rounded-[var(--shape-control)] border-0 bg-transparent text-[var(--text-tertiary)] transition-colors duration-[120ms] hover:bg-[var(--surface-inset)] hover:text-[var(--accent-400)] aria-pressed:text-[var(--accent-400)]" disabled={pendingFavorite !== null} onClick={() => void toggleFavourite(course)} type="button"><Star aria-hidden size={19} weight={favorites.has(course.id) ? "fill" : "regular"} /></button> : null}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
