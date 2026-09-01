import { GradeEntryView } from "@/components/exams/grade-entry-view";

export default async function GradeEntryPage({
  params,
}: PageProps<"/exams/[id]/grades/[examSubjectId]">) {
  const { id, examSubjectId } = await params;

  return <GradeEntryView examId={id} examSubjectId={examSubjectId} />;
}
