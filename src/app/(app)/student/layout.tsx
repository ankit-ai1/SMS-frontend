import type { ReactNode } from "react";

import { StudentPortalProvider } from "@/components/student/student-context";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <StudentPortalProvider>{children}</StudentPortalProvider>;
}
