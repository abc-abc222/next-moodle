"use client";

import { LockKey, SignIn } from "@phosphor-icons/react";
import ky, { isKyError } from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { Button, Field, Notice } from "@/components/ui";

const LoginInputSchema = z.object({
  password: z.string().min(1).max(4_096),
  username: z.string().trim().min(1).max(256),
});

const LoginResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({
    error: z.object({ code: z.string().min(1).max(128) }),
    ok: z.literal(false),
  }),
]);

type LoginError = "connection" | "credentials" | "generic" | "invalid";

const ERROR_COPY: Readonly<Record<LoginError, Readonly<{ title: string; body: string }>>> = {
  connection: {
    title: "Moodleに接続できません",
    body: "接続先の設定またはMoodleの稼働状況を確認し、少し待ってから再度お試しください。",
  },
  credentials: {
    title: "ログインできませんでした",
    body: "入力内容を確認してください。安全のため、どの項目が一致しなかったかは表示しません。",
  },
  generic: {
    title: "ログイン処理を完了できません",
    body: "入力内容は保存されていません。時間をおいて、もう一度お試しください。",
  },
  invalid: {
    title: "入力内容を確認してください",
    body: "ユーザー名とパスワードの両方を入力してください。",
  },
};

function errorForCode(code: string): LoginError {
  if (code === "authentication_failed") {
    return "credentials";
  }
  if (
    code === "configuration_error" ||
    code === "function_unavailable" ||
    code === "moodle_unavailable"
  ) {
    return "connection";
  }
  if (code === "invalid_request") {
    return "invalid";
  }
  return "generic";
}

export function LoginForm() {
  const [pending, setPending] = useState(false);
  const [loginError, setLoginError] = useState<LoginError | null>(null);
  const router = useRouter();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsedInput = LoginInputSchema.safeParse({
      password: formData.get("password"),
      username: formData.get("username"),
    });
    if (!parsedInput.success) {
      setLoginError("invalid");
      return;
    }

    setPending(true);
    setLoginError(null);
    try {
      const response = await ky.post("/api/auth/login", {
        json: parsedInput.data,
        retry: 0,
        throwHttpErrors: false,
        timeout: 15_000,
      });
      const parsedResponse = LoginResponseSchema.safeParse(await response.json<unknown>());
      if (!parsedResponse.success) {
        setLoginError("generic");
        return;
      }
      if (!parsedResponse.data.ok) {
        setLoginError(errorForCode(parsedResponse.data.error.code));
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      if (isKyError(error) || error instanceof SyntaxError) {
        setLoginError("connection");
        return;
      }
      throw error;
    } finally {
      setPending(false);
    }
  };

  const copy = loginError === null ? null : ERROR_COPY[loginError];

  return (
    <form className="ui-login-form grid gap-4" noValidate onSubmit={submit}>
      <Field
        autoComplete="username"
        disabled={pending}
        id="username"
        label="Moodleユーザー名"
        name="username"
        placeholder="ユーザー名"
        required
        status={loginError === "invalid" ? "error" : "default"}
      />
      <Field
        autoComplete="current-password"
        disabled={pending}
        id="password"
        label="パスワード"
        name="password"
        required
        status={loginError === "invalid" ? "error" : "default"}
        type="password"
      />
      {copy === null ? null : (
        <Notice title={copy.title} tone="error" urgent>
          <p>{copy.body}</p>
        </Notice>
      )}
      <Button
        className="w-full"
        icon={<SignIn aria-hidden size={19} weight="regular" />}
        loading={pending}
        type="submit"
        variant="primary"
      >
        Moodleでログイン
      </Button>
      <div className="ui-login-security grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-[var(--shape-control)] bg-[var(--surface-inset)] p-3 text-sm text-[var(--text-secondary)]">
        <LockKey aria-hidden className="mt-0.5 shrink-0" size={19} weight="regular" />
        <p className="m-0 leading-6">
          認証情報は設定済みのMoodleへサーバー経由で送信され、保存されません。
          発行されたセッションは暗号化されたHttpOnly Cookieで保護されます。
        </p>
      </div>
    </form>
  );
}
