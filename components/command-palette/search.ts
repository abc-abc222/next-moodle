export type CommandItem = {
  readonly href: string;
  readonly keywords: readonly string[];
  readonly kind: "activity" | "course" | "file" | "message" | "screen";
  readonly label: string;
};

function normalizedText(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("ja");
}

export function searchCommands(
  commands: readonly CommandItem[],
  query: string,
): readonly CommandItem[] {
  const terms = normalizedText(query).split(/\s+/).filter(Boolean);
  const seen = new Set<string>();
  const unique = (command: CommandItem): boolean => {
    const key = `${command.kind}:${command.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
  if (terms.length === 0) {
    return commands.filter(unique).slice(0, 12);
  }
  return commands
    .filter((command) => {
      const haystack = normalizedText(
        `${command.label} ${command.keywords.join(" ")}`,
      );
      return terms.every((term) => haystack.includes(term));
    })
    .sort((left, right) => {
      const needle = terms.join(" ");
      const leftStarts = normalizedText(left.label).startsWith(needle);
      const rightStarts = normalizedText(right.label).startsWith(needle);
      return Number(rightStarts) - Number(leftStarts);
    })
    .filter(unique)
    .slice(0, 12);
}
