"use client";
import type { ReactNode } from "react";
import { RoleShell } from "@/components/kv/shell";

export default function KidLayout({ children }: { children: ReactNode }) {
  return <RoleShell role="kid">{children}</RoleShell>;
}
