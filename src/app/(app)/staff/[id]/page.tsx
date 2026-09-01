import { StaffDetailView } from "@/components/staff/staff-detail-view";

export default async function StaffDetailPage({
  params,
}: PageProps<"/staff/[id]">) {
  const { id } = await params;

  return <StaffDetailView staffId={id} />;
}
