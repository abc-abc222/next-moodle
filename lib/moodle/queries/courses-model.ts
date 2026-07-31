import type {
  MoodleCourseModule,
  MoodleDashboardCourse,
} from "@/lib/moodle/server";
import { ACTIVITY_MODULE_NAMES } from "@/lib/moodle/capability-contract";

const INTERNAL_ACTIVITY_MODULES: ReadonlySet<string> = new Set(
  ACTIVITY_MODULE_NAMES,
);

export type CourseClassification = "active" | "future" | "past";

export type CourseListItem = {
  readonly classification: CourseClassification;
  readonly endDate?: number;
  readonly id: number;
  readonly isFavourite: boolean;
  readonly name: string;
  readonly shortName: string;
  readonly startDate?: number;
};

export type CourseModuleWithUrl = MoodleCourseModule & {
  readonly url?: string | undefined;
};

export type ActivityDestination =
  | { readonly kind: "internal"; readonly href: string }
  | { readonly kind: "moodle"; readonly href: string }
  | {
      readonly kind: "disabled";
      readonly reason: "adapter_required" | "hidden" | "url_unavailable";
    };

export function classifyCourse(
  course: MoodleDashboardCourse,
  nowSeconds: number,
): CourseClassification {
  if (course.enddate !== undefined && course.enddate > 0 && course.enddate < nowSeconds) {
    return "past";
  }
  if (course.startdate !== undefined && course.startdate > nowSeconds) {
    return "future";
  }
  return "active";
}

export function projectCourseList(
  courses: readonly MoodleDashboardCourse[],
  nowSeconds: number,
): readonly CourseListItem[] {
  const projected: CourseListItem[] = [];
  for (const course of courses) {
    if (course.visible === 0) continue;
    projected.push({
      classification: classifyCourse(course, nowSeconds),
      id: course.id,
      isFavourite: course.isfavourite,
      name: course.fullname,
      shortName: course.shortname,
      ...(course.startdate === undefined ? {} : { startDate: course.startdate }),
      ...(course.enddate === undefined ? {} : { endDate: course.enddate }),
    });
  }
  return projected.sort((left, right) => {
      const order: Readonly<Record<CourseClassification, number>> = {
        active: 0,
        future: 1,
        past: 2,
      };
      return order[left.classification] - order[right.classification] ||
        left.name.localeCompare(right.name, "ja");
  });
}

export function filterCourseItems(
  courses: readonly CourseListItem[],
  query: string,
): readonly CourseListItem[] {
  const normalized = query.normalize("NFKC").trim().toLocaleLowerCase("ja");
  if (normalized === "") {
    return courses;
  }
  return courses.filter((course) =>
    `${course.name} ${course.shortName}`
      .normalize("NFKC")
      .toLocaleLowerCase("ja")
      .includes(normalized),
  );
}

export function safeMoodleUrl(url: string, siteUrl: string): string | null {
  try {
    const candidate = new URL(url);
    const site = new URL(siteUrl);
    const sitePath = site.pathname.endsWith("/") ? site.pathname : `${site.pathname}/`;
    const candidatePath = candidate.pathname.startsWith("/")
      ? candidate.pathname
      : `/${candidate.pathname}`;
    const hasToken = [...candidate.searchParams.keys()].some((key) =>
      key.toLocaleLowerCase("en").includes("token"),
    );
    if (
      candidate.origin !== site.origin ||
      !candidatePath.startsWith(sitePath) ||
      candidate.username !== "" ||
      candidate.password !== "" ||
      hasToken
    ) {
      return null;
    }
    return candidate.toString();
  } catch (error) {
    if (error instanceof TypeError) {
      return null;
    }
    throw error;
  }
}

export function activityDestination(
  courseModule: CourseModuleWithUrl,
  siteUrl: string,
): ActivityDestination {
  if (courseModule.visible === 0 || courseModule.uservisible === false) {
    return { kind: "disabled", reason: "hidden" };
  }
  if (courseModule.modname === "assign") {
    return { kind: "internal", href: `/assignments/${courseModule.id}` };
  }
  if (INTERNAL_ACTIVITY_MODULES.has(courseModule.modname)) {
    return { kind: "internal", href: `/activities/${courseModule.id}` };
  }
  const sourceUrl = courseModule.url === undefined
    ? null
    : safeMoodleUrl(courseModule.url, siteUrl);
  if (sourceUrl !== null) {
    return { kind: "moodle", href: sourceUrl };
  }
  return { kind: "disabled", reason: "adapter_required" };
}

export function isInlineCourseLabel(courseModule: MoodleCourseModule): boolean {
  return courseModule.modname === "label";
}
