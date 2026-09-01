"use client";

import { Library } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * What every teacher screen shows when `/sections/mine` comes back empty. The
 * list is authoritative, so this is a settled state rather than a failure —
 * the fix is an admin assigning them a section.
 */
export function NoSectionsCard() {
  return (
    <Card className="shadow-card">
      <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Library className="size-6" />
        </span>
        <p className="mt-4 text-sm font-medium">No sections assigned</p>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
          You are not assigned to any sections yet — contact your admin.
        </p>
      </CardContent>
    </Card>
  );
}
