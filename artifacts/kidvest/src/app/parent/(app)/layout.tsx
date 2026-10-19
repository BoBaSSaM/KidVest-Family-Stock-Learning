"use client";
import type { ReactNode } from "react";
import { RoleShell } from "@/components/kv/shell";

export default function ParentLayout({ children }: { children: ReactNode }) {
  return <RoleShell role="parent">{children}</RoleShell>;
}
