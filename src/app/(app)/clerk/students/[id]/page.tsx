import { ClerkStudentDetailView } from "@/components/clerk/clerk-student-detail-view";

export default async function ClerkStudentDetailPage({
  params,
}: PageProps<"/clerk/students/[id]">) {
  const { id } = await params;

  return <ClerkStudentDetailView studentId={id} />;
}
