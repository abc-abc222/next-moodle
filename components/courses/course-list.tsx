"use client";

import { Books, MagnifyingGlass, Star } from "@phosphor-icons/react";
import ky from "ky";
import { useMemo, useState } from "react";

import { SharedTransition, TransitionLink } from "@/components/app-shell/transitions";
import { Badge, Button, Field, Notice } from "@/components/ui";
import type { AppRuntimeConfig } from "@/lib/app-config";
import {
  filterCourseItems,
  type CourseClassification,
  type CourseListItem,
} from "@/lib/moodle/queries/courses-model";
import "./courses.css";

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
      <Notice title="表示できる受講コースはありません" tone="info">
        <p>コースへの登録が反映されると、ここに表示されます。</p>
      </Notice>
    );
  }

  return (
    <div className="ui-courses-browser">
      <div className="ui-courses-search">
        <MagnifyingGlass aria-hidden size={20} weight="regular" />
        <Field
          id="course-search"
          label="コースを検索"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="コース名または略称"
          type="search"
          value={query}
        />
      </div>
      <div className="ui-courses-filters" aria-label="コースの絞り込み" role="group">
        <Button aria-pressed={courseFilter === "all"} onClick={() => setCourseFilter("all")} size="compact" variant={courseFilter === "all" ? "primary" : "ghost"}>すべて</Button>
        {CLASSIFICATIONS.map((classification) => (
          <Button aria-pressed={courseFilter === classification} key={classification} onClick={() => setCourseFilter(classification)} size="compact" variant={courseFilter === classification ? "primary" : "ghost"}>{CLASSIFICATION_COPY[classification].label}</Button>
        ))}
        {canFavorite ? <Button aria-pressed={favoriteOnly} onClick={() => setFavoriteOnly((current) => !current)} size="compact" variant={favoriteOnly ? "primary" : "ghost"}><Star aria-hidden size={15} weight={favoriteOnly ? "fill" : "regular"} />スター付き</Button> : null}
      </div>
      <p aria-live="polite" className="ui-courses-result-count">{filtered.length}件のコースを表示</p>
      {favoriteError === "" ? null : <Notice title="スターを更新できませんでした" tone="error" urgent><p>{favoriteError}</p></Notice>}
      {filtered.length === 0 ? (
        <Notice title="検索条件に一致するコースはありません" tone="info">
          <p>コース名または略称を短くして、もう一度検索してください。</p>
        </Notice>
      ) : (
        CLASSIFICATIONS.map((classification) => {
          const group = filtered.filter((course) => course.classification === classification);
          if (group.length === 0) {
            return null;
          }
          const copy = CLASSIFICATION_COPY[classification];
          return (
            <section className="ui-courses-group" key={classification}>
              <header>
                <h2>{copy.label}</h2>
                <Badge tone={copy.tone}>{group.length}コース</Badge>
              </header>
              <div className="ui-courses-list" data-testid={`course-list-${classification}`}>
                <ul>
                  {group.map((course) => (
                    <li key={course.id}>
                      <div className="ui-courses-row"><TransitionLink href={`/courses/${course.id}`} intent="drill-in">
                        <span className="ui-courses-list__icon">
                          <Books aria-hidden size={21} weight="regular" />
                        </span>
                        <span className="ui-courses-list__title">
                          <SharedTransition identifier={course.id} kind="course"><strong>{course.name}</strong></SharedTransition>
                          <small>{course.shortName}</small>
                        </span>
                        <span className="ui-courses-list__period">{coursePeriod(course, dateFormat)}</span>
                      </TransitionLink>{canFavorite ? <button aria-label={favorites.has(course.id) ? `${course.name}のスターを解除` : `${course.name}にスターを付ける`} aria-pressed={favorites.has(course.id)} className="ui-course-favourite" disabled={pendingFavorite !== null} onClick={() => void toggleFavourite(course)} type="button"><Star aria-hidden size={19} weight={favorites.has(course.id) ? "fill" : "regular"} /></button> : null}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
