import { describe, expect, test } from "bun:test";

import { searchCommands } from "@/components/command-palette/search";

const commands = [
  {
    href: "/dashboard",
    keywords: ["home", "next"],
    kind: "screen" as const,
    label: "ダッシュボード",
  },
  {
    href: "/courses/101",
    keywords: ["BIO-101"],
    kind: "course" as const,
    label: "海洋生物学",
  },
  {
    href: "/courses/201",
    keywords: ["HIST-330"],
    kind: "course" as const,
    label: "公共史料研究",
  },
] as const;

describe("searchCommands", () => {
  test("Given a course short name, When searching, Then it returns only the matching course", () => {
    const result = searchCommands(commands, "bio-101");

    expect(result.map((command) => command.href)).toEqual(["/courses/101"]);
  });

  test("Given an empty query, When searching, Then screens remain before courses", () => {
    const result = searchCommands(commands, "");

    expect(result.map((command) => command.kind)).toEqual(["screen", "course", "course"]);
  });

  test("Given duplicate command results, When searching, Then one stable destination remains", () => {
    const result = searchCommands([
      commands[0],
      { ...commands[0], keywords: ["recent"] },
    ], "");

    expect(result).toHaveLength(1);
    expect(result[0]?.href).toBe("/dashboard");
  });
});
