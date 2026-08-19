import { notFound } from "next/navigation";
import { requireUser } from "@/lib/db/session";
import { getConversation } from "@/lib/db/conversations";
import { ConversationThreadView } from "@/components/marketplace/conversation-thread";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const thread = await getConversation(id);
  if (!thread) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <ConversationThreadView thread={thread} />
    </main>
  );
}
