import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DOC_SECTIONS, isDocSectionId } from "../sections";

interface SectionPageProps {
  params: Promise<{ section: string }>;
}

export function generateStaticParams(): Array<{ section: string }> {
  return DOC_SECTIONS.map((section) => ({ section: section.id }));
}

export async function generateMetadata({ params }: SectionPageProps): Promise<Metadata> {
  const { section } = await params;
  const match = DOC_SECTIONS.find((s) => s.id === section);
  return {
    title: match ? `${match.title} — Breeja docs` : "Docs — Breeja SDK",
  };
}

export default async function DocsSectionPage({ params }: SectionPageProps) {
  const { section } = await params;

  if (!isDocSectionId(section)) {
    notFound();
  }

  redirect(`/docs#${section}`);
}
