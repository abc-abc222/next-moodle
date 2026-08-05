import type { ReactNode } from "react";

import type { MoodleDocument, MoodleHtmlNode } from "@/lib/moodle/html";
import { QuizResponseEditor } from "@/components/activities/quiz-response-editor";
import { classNames } from "./class-names";

type RichContentVariant = "default" | "quiz";

function renderNodes(nodes: readonly MoodleHtmlNode[], variant: RichContentVariant, onInput?: () => void): ReactNode {
  return nodes.map((node, index) => onInput === undefined
    ? <RichNode key={index} node={node} variant={variant} />
    : <RichNode key={index} node={node} onInput={onInput} variant={variant} />);
}

function tableSections(nodes: readonly MoodleHtmlNode[]): readonly MoodleHtmlNode[] {
  return nodes.filter((node) => node.kind === "tableHead" || node.kind === "tableBody");
}

function tableRows(nodes: readonly MoodleHtmlNode[]): readonly MoodleHtmlNode[] {
  return nodes.filter((node) => node.kind === "tableRow");
}

function tableCells(nodes: readonly MoodleHtmlNode[]): readonly MoodleHtmlNode[] {
  return nodes.filter((node) => node.kind === "tableCell");
}

function RichNode({ node, onInput, variant }: Readonly<{ node: MoodleHtmlNode; onInput?: () => void; variant: RichContentVariant }>): ReactNode {
  switch (node.kind) {
    case "text": return node.value;
    case "break": return <br />;
    case "paragraph": return <p>{renderNodes(node.children, variant, onInput)}</p>;
    case "heading": return node.level === 2 ? <h2>{renderNodes(node.children, variant, onInput)}</h2> : node.level === 3 ? <h3>{renderNodes(node.children, variant, onInput)}</h3> : <h4>{renderNodes(node.children, variant, onInput)}</h4>;
    case "blockquote": return <blockquote>{renderNodes(node.children, variant, onInput)}</blockquote>;
    case "pre": return <pre>{renderNodes(node.children, variant, onInput)}</pre>;
    case "div": return <div className={node.className}>{renderNodes(node.children, variant, onInput)}</div>;
    case "span": return <span className={node.className}>{renderNodes(node.children, variant, onInput)}</span>;
    case "strong": return <strong>{renderNodes(node.children, variant, onInput)}</strong>;
    case "em": return <em>{renderNodes(node.children, variant, onInput)}</em>;
    case "strike": return <s>{renderNodes(node.children, variant, onInput)}</s>;
    case "code": return <code>{renderNodes(node.children, variant, onInput)}</code>;
    case "label": return <label className={node.className} htmlFor={node.htmlFor}>{renderNodes(node.children, variant, onInput)}</label>;
    case "link": return <a href={node.href} {...(node.external ? { rel: "noopener noreferrer", target: "_blank" } : {})} title={node.title}>{renderNodes(node.children, variant, onInput)}</a>;
    // Moodle's protected files are fetched via the authenticated BFF proxy, so
    // Next image optimization cannot safely fetch them at build time.
    // eslint-disable-next-line @next/next/no-img-element
    case "image": return <img alt={node.alt} height={node.height} src={node.src} title={node.title} width={node.width} />;
    case "list": return node.ordered ? <ol>{renderNodes(node.items, variant, onInput)}</ol> : <ul>{renderNodes(node.items, variant, onInput)}</ul>;
    case "listItem": return <li>{renderNodes(node.children, variant, onInput)}</li>;
    case "table": return <table>{renderNodes(tableSections(node.children), variant, onInput)}</table>;
    case "tableHead": return <thead>{renderNodes(tableRows(node.children), variant, onInput)}</thead>;
    case "tableBody": return <tbody>{renderNodes(tableRows(node.children), variant, onInput)}</tbody>;
    case "tableRow": return <tr>{renderNodes(tableCells(node.children), variant, onInput)}</tr>;
    case "tableCell": return node.heading ? <th colSpan={node.colSpan} rowSpan={node.rowSpan} scope={node.scope}>{renderNodes(node.children, variant, onInput)}</th> : <td colSpan={node.colSpan} rowSpan={node.rowSpan}>{renderNodes(node.children, variant, onInput)}</td>;
    case "input": return <input aria-label={node.inputType === "hidden" || node.id !== undefined ? undefined : "回答"} className={node.className} defaultChecked={node.checked} defaultValue={node.value} disabled={node.disabled} id={node.id} max={node.max} maxLength={node.maxLength} min={node.min} name={node.name} step={node.step} type={node.inputType} />;
    case "select": {
      const values = node.options.filter((option) => option.selected).map((option) => option.value);
      return <select aria-label={node.id === undefined ? "回答を選択" : undefined} defaultValue={node.multiple ? values : values[0]} disabled={node.disabled} id={node.id} multiple={node.multiple} name={node.name}>{node.options.map((option) => <option disabled={option.disabled} key={option.value} value={option.value}>{option.label}</option>)}</select>;
    }
    case "textarea": {
      if (variant === "quiz") {
        return onInput === undefined
          ? <QuizResponseEditor node={node} />
          : <QuizResponseEditor node={node} onChange={() => onInput()} />;
      }
      return <textarea aria-label={node.id === undefined ? "回答" : undefined} className="ui-rich-textarea" cols={node.cols} data-editor="moodle-response" defaultValue={node.value} disabled={node.disabled} id={node.id} maxLength={node.maxLength} name={node.name} rows={node.rows ?? 8} spellCheck wrap="soft" />;
    }
    case "button": return <button className={node.className} data-quiz-action={node.action} type="button">{renderNodes(node.children, variant, onInput)}</button>;
  }
}

export function RichContent({ className, document, onInput, variant = "default" }: Readonly<{ className?: string; document: MoodleDocument; onInput?: () => void; variant?: RichContentVariant }>) {
  return (
    <div
      className={classNames(
        "ui-rich-content min-w-0 text-[var(--text-secondary)] leading-7 break-words",
        "[&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_p]:my-3 [&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--text-primary)]",
        "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[var(--text-primary)] [&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:font-semibold [&_h4]:text-[var(--text-primary)]",
        "[&_ul]:my-3 [&_ul]:grid [&_ul]:gap-1.5 [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:grid [&_ol]:gap-1.5 [&_ol]:pl-6",
        "[&_a]:font-medium [&_a]:text-[var(--text-primary)] [&_a]:underline [&_a]:decoration-[var(--border-strong)] [&_a]:underline-offset-4 hover:[&_a]:decoration-[var(--accent-400)]",
        "[&_blockquote]:my-4 [&_blockquote]:rounded-r-[var(--shape-control)] [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--border-strong)] [&_blockquote]:bg-[var(--surface-inset)] [&_blockquote]:px-4 [&_blockquote]:py-3",
        "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-[var(--shape-control)] [&_pre]:bg-[var(--surface-inset)] [&_pre]:p-4 [&_code]:font-mono [&_code]:text-sm",
        "[&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-[var(--shape-control)]",
        "[&_table]:my-5 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:bg-[var(--surface-inset)] [&_th]:font-semibold [&_th]:text-[var(--text-primary)] [&_th]:text-left [&_th]:p-3 [&_td]:p-3 [&_th]:border-b [&_td]:border-b [&_th]:border-[var(--border-subtle)] [&_td]:border-[var(--border-subtle)]",
        variant === "quiz" && [
          "grid gap-4 text-[var(--text-primary)]",
          "[&_.que]:grid [&_.que]:gap-4 [&_.content]:grid [&_.content]:gap-4 [&_.formulation]:grid [&_.formulation]:gap-4",
          "[&_.quiz-source-hidden]:hidden [&_.info]:hidden [&_.accesshide]:hidden",
          "[&_.qtext]:max-w-[44rem] [&_.qtext]:text-base [&_.qtext]:font-medium [&_.qtext]:leading-8",
          "[&_.ablock]:grid [&_.ablock]:gap-3 [&_.ablock]:rounded-[var(--shape-card)] [&_.ablock]:bg-[var(--surface-inset)] [&_.ablock]:p-4",
          "[&_.answer]:grid [&_.answer]:gap-2 [&_.quiz-response-answer]:grid [&_.quiz-response-answer]:gap-2",
          "[&_.answer>label]:grid [&_.answer>label]:min-h-13 [&_.answer>label]:grid-cols-[auto_minmax(0,1fr)] [&_.answer>label]:items-start [&_.answer>label]:gap-3 [&_.answer>label]:rounded-[var(--shape-control)] [&_.answer>label]:bg-[var(--surface-primary)] [&_.answer>label]:p-3",
          "[&_.quiz-response-answer>label]:grid [&_.quiz-response-answer>label]:min-h-13 [&_.quiz-response-answer>label]:grid-cols-[auto_minmax(0,1fr)] [&_.quiz-response-answer>label]:items-start [&_.quiz-response-answer>label]:gap-3 [&_.quiz-response-answer>label]:rounded-[var(--shape-control)] [&_.quiz-response-answer>label]:bg-[var(--surface-primary)] [&_.quiz-response-answer>label]:p-3",
          "[&_input:not([type='hidden'])]:min-h-11 [&_input:not([type='hidden'])]:rounded-[var(--shape-control)] [&_input:not([type='hidden'])]:bg-[var(--surface-primary)] [&_input:not([type='hidden'])]:px-3 [&_select]:min-h-11 [&_select]:w-full [&_select]:rounded-[var(--shape-control)] [&_select]:bg-[var(--surface-primary)] [&_select]:px-3",
          "[&_input[type='radio']]:size-[1.125rem] [&_input[type='radio']]:min-h-0 [&_input[type='radio']]:p-0 [&_input[type='checkbox']]:size-[1.125rem] [&_input[type='checkbox']]:min-h-0 [&_input[type='checkbox']]:p-0 [&_input]:accent-[var(--accent-500)]",
          "[&_textarea]:min-h-44 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-[var(--shape-card)] [&_textarea]:bg-[var(--surface-primary)] [&_textarea]:p-4 [&_textarea]:outline-none focus-visible:[&_textarea]:shadow-[var(--shadow-focus)]",
          "[&_button[data-quiz-action='clear']]:min-h-11 [&_button[data-quiz-action='clear']]:justify-self-start [&_button[data-quiz-action='clear']]:rounded-[var(--shape-control)] [&_button[data-quiz-action='clear']]:bg-[var(--surface-inset)] [&_button[data-quiz-action='clear']]:px-3 [&_button[data-quiz-action='clear']]:text-sm",
          "[&_.specificfeedback]:rounded-[var(--shape-control)] [&_.specificfeedback]:bg-[var(--surface-inset)] [&_.specificfeedback]:p-3 [&_.rightanswer]:rounded-[var(--shape-control)] [&_.rightanswer]:bg-[var(--status-success-soft)] [&_.rightanswer]:p-3 [&_.validationerror]:rounded-[var(--shape-control)] [&_.validationerror]:bg-[var(--status-error-soft)] [&_.validationerror]:p-3",
        ].join(" "),
        className,
      )}
    >
      {renderNodes(document.nodes, variant, onInput)}
    </div>
  );
}
