import { StudentDetailView } from "@/components/students/student-detail-view";

export default async function StudentDetailPage({
  params,
}: PageProps<"/students/[id]">) {
  const { id } = await params;

  return <StudentDetailView studentId={id} />;
}
