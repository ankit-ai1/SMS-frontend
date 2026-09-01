import { ExamDetailView } from "@/components/exams/exam-detail-view";

export default async function ExamDetailPage({
  params,
}: PageProps<"/exams/[id]">) {
  const { id } = await params;

  return <ExamDetailView examId={id} />;
}
