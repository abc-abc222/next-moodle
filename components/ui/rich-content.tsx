import type { ReactNode } from "react";

import type { MoodleDocument, MoodleHtmlNode } from "@/lib/moodle/html";

function renderNodes(nodes: readonly MoodleHtmlNode[]): ReactNode {
  return nodes.map((node, index) => <RichNode key={index} node={node} />);
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

function RichNode({ node }: Readonly<{ node: MoodleHtmlNode }>): ReactNode {
  switch (node.kind) {
    case "text": return node.value;
    case "break": return <br />;
    case "paragraph": return <p>{renderNodes(node.children)}</p>;
    case "heading": return node.level === 2 ? <h2>{renderNodes(node.children)}</h2> : node.level === 3 ? <h3>{renderNodes(node.children)}</h3> : <h4>{renderNodes(node.children)}</h4>;
    case "blockquote": return <blockquote>{renderNodes(node.children)}</blockquote>;
    case "pre": return <pre>{renderNodes(node.children)}</pre>;
    case "div": return <div className={node.className}>{renderNodes(node.children)}</div>;
    case "span": return <span className={node.className}>{renderNodes(node.children)}</span>;
    case "strong": return <strong>{renderNodes(node.children)}</strong>;
    case "em": return <em>{renderNodes(node.children)}</em>;
    case "strike": return <s>{renderNodes(node.children)}</s>;
    case "code": return <code>{renderNodes(node.children)}</code>;
    case "label": return <label className={node.className} htmlFor={node.htmlFor}>{renderNodes(node.children)}</label>;
    case "link": return <a href={node.href} {...(node.external ? { rel: "noopener noreferrer", target: "_blank" } : {})} title={node.title}>{renderNodes(node.children)}</a>;
    // Moodle's protected files are fetched via the authenticated BFF proxy, so
    // Next image optimization cannot safely fetch them at build time.
    // eslint-disable-next-line @next/next/no-img-element
    case "image": return <img alt={node.alt} height={node.height} src={node.src} title={node.title} width={node.width} />;
    case "list": return node.ordered ? <ol>{renderNodes(node.items)}</ol> : <ul>{renderNodes(node.items)}</ul>;
    case "listItem": return <li>{renderNodes(node.children)}</li>;
    case "table": return <table>{renderNodes(tableSections(node.children))}</table>;
    case "tableHead": return <thead>{renderNodes(tableRows(node.children))}</thead>;
    case "tableBody": return <tbody>{renderNodes(tableRows(node.children))}</tbody>;
    case "tableRow": return <tr>{renderNodes(tableCells(node.children))}</tr>;
    case "tableCell": return node.heading ? <th colSpan={node.colSpan} rowSpan={node.rowSpan} scope={node.scope}>{renderNodes(node.children)}</th> : <td colSpan={node.colSpan} rowSpan={node.rowSpan}>{renderNodes(node.children)}</td>;
    case "input": return <input className={node.className} defaultChecked={node.checked} defaultValue={node.value} disabled={node.disabled} id={node.id} max={node.max} maxLength={node.maxLength} min={node.min} name={node.name} step={node.step} type={node.inputType} />;
    case "select": {
      const values = node.options.filter((option) => option.selected).map((option) => option.value);
      return <select defaultValue={node.multiple ? values : values[0]} disabled={node.disabled} id={node.id} multiple={node.multiple} name={node.name}>{node.options.map((option) => <option disabled={option.disabled} key={option.value} value={option.value}>{option.label}</option>)}</select>;
    }
    case "textarea": return <textarea cols={node.cols} defaultValue={node.value} disabled={node.disabled} id={node.id} maxLength={node.maxLength} name={node.name} rows={node.rows} />;
    case "button": return <button className={node.className} data-quiz-action={node.action} type="button">{renderNodes(node.children)}</button>;
  }
}

export function RichContent({ className, document }: Readonly<{ className?: string; document: MoodleDocument }>) {
  return <div className={className}>{renderNodes(document.nodes)}</div>;
}
