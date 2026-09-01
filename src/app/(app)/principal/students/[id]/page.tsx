import { PrincipalStudentDetailView } from "@/components/principal/principal-student-detail-view";

export default async function PrincipalStudentDetailPage({
  params,
}: PageProps<"/principal/students/[id]">) {
  const { id } = await params;

  return <PrincipalStudentDetailView studentId={id} />;
}
