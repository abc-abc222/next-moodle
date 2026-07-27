"use client";

import { useCallback, useEffect, useState } from "react";

export type AiConsentState = "loading" | "granted" | "required";
const CHANGE_EVENT = "next-moodle:ai-consent-change";

export function useAiConsent(storageKey: string): Readonly<{
  grant: () => void;
  revoke: () => void;
  state: AiConsentState;
}> {
  const [state, setState] = useState<AiConsentState>("loading");
  useEffect(() => {
    const sync = () => setState(window.localStorage.getItem(storageKey) === "granted" ? "granted" : "required");
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, [storageKey]);
  const grant = useCallback(() => {
    window.localStorage.setItem(storageKey, "granted");
    setState("granted");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [storageKey]);
  const revoke = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    setState("required");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [storageKey]);
  return { grant, revoke, state };
}
