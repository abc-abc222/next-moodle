const ERROR_COPY: Readonly<Record<string, string>> = {
  authentication_failed: "セッションが終了しました。文章は端末内に残っています。再ログインしてください。",
  existing_file_unavailable: "保存済みファイルを再取得できません。画面を再読み込みして、もう一度確認してください。",
  file_count_exceeded: "提出できるファイル数を超えています。ファイルを減らしてください。",
  file_signature_mismatch: "ファイルの内容と形式が一致しません。正しいファイルを書き出し直してください。",
  file_too_large: "ファイル容量が上限を超えています。圧縮するか分割してください。",
  moodle_file_type_rejected: "この課題では許可されていないファイル形式です。",
  native_submission_unavailable: "提出条件が変わりました。画面を更新して状態を確認してください。",
  online_text_too_large: "オンラインテキストが上限を超えています。本文を短くしてください。",
  permission_denied: "この課題を提出する権限がありません。Moodle管理者へ確認してください。",
  request_too_large: "提出全体の容量が上限を超えています。",
  unsupported_file_type: "安全に確認できないファイル形式です。PDFなど対応形式へ変換してください。",
};

export const APP_MAX_SUBMISSION_BYTES = 12 * 1_024 * 1_024;

const APP_FILE_EXTENSIONS = new Set([
  ".csv", ".doc", ".docx", ".gif", ".jpeg", ".jpg", ".md", ".pdf", ".png",
  ".ppt", ".pptx", ".txt", ".webp", ".xls", ".xlsx",
]);

function extensionFor(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot < 0 ? "" : filename.slice(dot).toLowerCase();
}

export function fileIdentity(file: File): string {
  return `${file.name}\u0000${file.size}\u0000${file.lastModified}\u0000${file.type}`;
}

export function matchesAcceptedType(file: File, accepted: readonly string[]): boolean {
  const extension = extensionFor(file.name);
  const mime = file.type.split(";", 1)[0]?.toLowerCase() ?? "";
  if (!APP_FILE_EXTENSIONS.has(extension)) return false;
  if (accepted.length === 0 || accepted.includes("*")) return true;
  return accepted.some((entry) => {
    const value = entry.toLowerCase();
    if (value.startsWith(".")) return extension === value;
    if (value.endsWith("/*")) return mime.startsWith(value.slice(0, -1));
    if (value === "image") return mime.startsWith("image/");
    if (value === "document") {
      return mime.startsWith("text/") || mime.includes("document") || mime === "application/pdf";
    }
    return mime === value;
  });
}

export function submissionErrorMessage(code: string): string {
  return ERROR_COPY[code] ?? "Moodleへ保存できませんでした。入力は残っています。";
}
