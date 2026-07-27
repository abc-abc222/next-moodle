type PlainWritingEditorProps = Readonly<{
  disabled: boolean;
  maxLength: number;
  onChange: (value: string) => void;
  value: string;
}>;

export function PlainWritingEditor(props: PlainWritingEditorProps) {
  return (
    <div className="ui-plain-editor">
      <textarea
        aria-label="本文"
        className="ui-plain-editor__input"
        disabled={props.disabled}
        maxLength={props.maxLength}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        value={props.value}
      />
    </div>
  );
}
