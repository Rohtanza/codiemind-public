import React from "react";
import { getIt } from "@/di/container";
import { ThemeService } from "@/ui/ThemeService";

export function Header({ title }: { title: string }) {
  const theme = getIt.get<ThemeService>(ThemeService);
  return <h1 style={{ color: theme.primary() }}>{title}</h1>;
}
