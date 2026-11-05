import QuestionnairePage, { questionnaireMetadata } from "./QuestionnairePage";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return questionnaireMetadata(token);
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <QuestionnairePage token={token} />;
}
