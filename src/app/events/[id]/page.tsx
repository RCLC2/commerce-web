import { EventDetailPage } from "@/components/event-detail-page";

export default async function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <EventDetailPage eventId={Number(id)} />;
}
