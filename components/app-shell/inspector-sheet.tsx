"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";

import { Button, DialogSheet } from "@/components/ui";

type InspectorSheetProps = Readonly<{
  children: ReactNode;
  description?: ReactNode;
  label: ReactNode;
  title: ReactNode;
}>;

export function InspectorSheet({ children, description, label, title }: InspectorSheetProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className="ui-inspector-sheet__trigger"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        variant="secondary"
      >
        {label}
      </Button>
      <DialogSheet
        description={description}
        label="詳細"
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) window.setTimeout(() => triggerRef.current?.focus(), 190);
        }}
        open={open}
        placement="right"
        title={title}
      >
        {children}
      </DialogSheet>
    </>
  );
}
