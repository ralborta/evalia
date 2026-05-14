import { PublicInterviewPage } from "@/components/public-interview/PublicInterviewPage";

export default async function InterviewPublicRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicInterviewPage token={token} />;
}
