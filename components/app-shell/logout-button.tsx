"use client";

import { SignOut } from "@phosphor-icons/react";
import ky, { isKyError } from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui";

type SessionEndButtonProps = Readonly<{
  errorMessage: string;
  label: string;
  redirectHref: string;
  variant: "ghost" | "secondary";
}>;

function SessionEndButton({
  errorMessage,
  label,
  redirectHref,
  variant,
}: SessionEndButtonProps) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const router = useRouter();

  const logout = async () => {
    setPending(true);
    setFailed(false);
    try {
      const response = await ky.post("/api/auth/logout", {
        json: {},
        retry: 0,
        throwHttpErrors: false,
      });
      if (!response.ok) {
        setFailed(true);
        return;
      }
      router.replace(redirectHref);
      router.refresh();
    } catch (error) {
      if (isKyError(error)) {
        setFailed(true);
        return;
      }
      throw error;
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="ui-app-logout grid gap-1.5">
      <Button
        icon={<SignOut aria-hidden size={18} weight="regular" />}
        loading={pending}
        onClick={logout}
        variant={variant}
      >
        {label}
      </Button>
      <span aria-live="polite" className="ui-app-logout__status min-h-4 text-xs text-[var(--status-error)]">
        {failed ? errorMessage : ""}
      </span>
    </div>
  );
}

export function LogoutButton() {
  return (
    <SessionEndButton
      errorMessage="ログアウトできませんでした。もう一度お試しください。"
      label="ログアウト"
      redirectHref="/login"
      variant="ghost"
    />
  );
}

export function ReauthenticateButton() {
  return (
    <SessionEndButton
      errorMessage="セッションを終了できませんでした。もう一度お試しください。"
      label="再ログイン"
      redirectHref="/login?reason=expired"
      variant="secondary"
    />
  );
}
