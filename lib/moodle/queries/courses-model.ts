import type {
  MoodleCourseModule,
  MoodleDashboardCourse,
} from "@/lib/moodle/server";

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
  | {
      readonly kind: "disabled";
      readonly reason: "hidden" | "url_unavailable";
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
    const ids = candidate.searchParams.getAll("id");
    const allowedActivityPath = /^\/mod\/[a-z0-9_]+\/view\.php$/.test(candidatePath.slice(sitePath.length - 1));
    if (
      candidate.origin !== site.origin ||
      !candidatePath.startsWith(sitePath) ||
      candidate.username !== "" ||
      candidate.password !== "" ||
      !allowedActivityPath ||
      ids.length !== 1 ||
      !/^[1-9]\d{0,9}$/.test(ids[0] ?? "") ||
      [...candidate.searchParams.keys()].some((key) => key !== "id")
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
): ActivityDestination {
  if (courseModule.visible === 0 || courseModule.uservisible === false) {
    return { kind: "disabled", reason: "hidden" };
  }
  if (courseModule.modname === "assign") {
    return { kind: "internal", href: `/assignments/${courseModule.id}` };
  }
  if (/^[a-z][a-z0-9_]{0,63}$/.test(courseModule.modname)) {
    return { kind: "internal", href: `/activities/${courseModule.id}` };
  }
  return { kind: "disabled", reason: "url_unavailable" };
}

export function isInlineCourseLabel(courseModule: MoodleCourseModule): boolean {
  return courseModule.modname === "label";
}
