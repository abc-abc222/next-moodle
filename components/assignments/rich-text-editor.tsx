"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  ArrowCounterClockwise,
  ArrowClockwise,
  LinkSimple,
  ListBullets,
  Quotes,
  TextB,
  TextHTwo,
  TextItalic,
} from "@phosphor-icons/react";
import { useEffect, useRef } from "react";

type RichTextEditorProps = Readonly<{
  ariaLabel?: string;
  disabled: boolean;
  editorId?: string;
  initialContent: string;
  onChange: (html: string) => void;
}>;

export function RichTextEditor(props: RichTextEditorProps) {
  const latest = useRef(props);

  useEffect(() => {
    latest.current = props;
  }, [props]);

  const editor = useEditor({
    content: props.initialContent,
    editable: !props.disabled,
    editorProps: {
      attributes: {
        "aria-label": props.ariaLabel ?? "文章エディター",
        ...(props.editorId === undefined ? {} : { id: props.editorId }),
      },
    },
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, protocols: ["http", "https", "mailto"] },
      }),
    ],
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      latest.current.onChange(current.getHTML());
    },
  });

  useEffect(() => {
    if (editor === null) return;
    editor.setEditable(!props.disabled);
  }, [editor, props.disabled]);

  useEffect(() => {
    if (editor === null || editor.getHTML() === props.initialContent) return;
    editor.commands.setContent(props.initialContent, { emitUpdate: false });
  }, [editor, props.initialContent]);

  if (editor === null) return <div className="ui-editor ui-editor--loading grid min-h-64 place-items-center rounded-[var(--shape-card)] bg-[var(--surface-inset)] text-sm text-[var(--text-secondary)]">エディターを読み込み中…</div>;

  const setLink = () => {
    const current = editor.getAttributes("link")["href"];
    const href = window.prompt("リンク先URL", typeof current === "string" ? current : "https://");
    if (href === null) return;
    if (href.trim() === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };
  const tools = [
    { label: "見出し", icon: TextHTwo, active: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "太字", icon: TextB, active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { label: "斜体", icon: TextItalic, active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { label: "リンク", icon: LinkSimple, active: editor.isActive("link"), run: setLink },
    { label: "箇条書き", icon: ListBullets, active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "引用", icon: Quotes, active: editor.isActive("blockquote"), run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "元に戻す", icon: ArrowCounterClockwise, active: false, run: () => editor.chain().focus().undo().run() },
    { label: "やり直す", icon: ArrowClockwise, active: false, run: () => editor.chain().focus().redo().run() },
  ] as const;

  return (
    <div className="ui-editor overflow-hidden rounded-[var(--shape-card)] bg-[var(--surface-elevated)] shadow-[var(--shadow-control)] transition-shadow duration-[120ms] focus-within:shadow-[var(--shadow-focus)]" data-disabled={props.disabled}>
      <div aria-label="文章編集ツール" className="ui-editor__toolbar flex min-h-14 flex-wrap items-center gap-1 bg-[var(--surface-inset)] p-2" role="toolbar">
        {tools.map(({ active, icon: Icon, label, run }) => (
          <button aria-label={label} aria-pressed={active} className="grid size-11 shrink-0 place-items-center rounded-[var(--shape-control)] border-0 bg-transparent text-[var(--text-secondary)] transition-colors duration-[120ms] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] aria-pressed:bg-[var(--surface-selected)] aria-pressed:text-[var(--accent-400)] disabled:opacity-45" disabled={props.disabled} key={label} onClick={run} type="button">
            <Icon aria-hidden size={18} weight="regular" />
          </button>
        ))}
      </div>
      <EditorContent className="[&_.tiptap]:min-h-80 [&_.tiptap]:px-5 [&_.tiptap]:py-6 [&_.tiptap]:text-base [&_.tiptap]:leading-8 [&_.tiptap]:text-[var(--text-primary)] [&_.tiptap]:outline-none sm:[&_.tiptap]:min-h-[24rem] sm:[&_.tiptap]:px-8 sm:[&_.tiptap]:py-7 [&_.tiptap_h2]:mt-6 [&_.tiptap_h2]:mb-3 [&_.tiptap_h2]:text-xl [&_.tiptap_p]:my-3 [&_.tiptap_blockquote]:border-l-2 [&_.tiptap_blockquote]:border-[var(--accent-500)] [&_.tiptap_blockquote]:pl-4" editor={editor} />
    </div>
  );
}
