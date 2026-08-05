type PlainWritingEditorProps = Readonly<{
  disabled: boolean;
  maxLength: number;
  onChange: (value: string) => void;
  value: string;
}>;

export function PlainWritingEditor(props: PlainWritingEditorProps) {
  return (
    <div className="ui-plain-editor min-h-80 overflow-hidden rounded-[var(--shape-card)] bg-[var(--surface-elevated)] shadow-[var(--shadow-control)] transition-shadow duration-[120ms] focus-within:shadow-[var(--shadow-focus)] sm:min-h-[24rem]">
      <textarea
        aria-label="本文"
        className="ui-plain-editor__input block min-h-80 w-full resize-y border-0 bg-transparent px-5 py-6 text-base leading-8 text-[var(--text-primary)] outline-none sm:min-h-[24rem] sm:px-8 sm:py-7"
        disabled={props.disabled}
        maxLength={props.maxLength}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        value={props.value}
      />
    </div>
  );
}
