import type { ReactNode } from "react";

import { ParentPortalProvider } from "@/components/parent/parent-context";

export default function ParentLayout({ children }: { children: ReactNode }) {
  return <ParentPortalProvider>{children}</ParentPortalProvider>;
}
