import type { Metadata } from "next";

import { StudentHtmlScreen } from "@/components/student/student-html-screen";
import { requireMoodleSession } from "@/lib/auth/server";

export const metadata: Metadata = { title: "プロフィールを編集" };

export default async function ProfileEditPage() {
  const session = await requireMoodleSession();
  return <StudentHtmlScreen description="公開範囲を確認しながらプロフィール情報を更新します。" session={session} surface="profile-edit" title="プロフィールを編集" />;
}
