import { ExternalLink, FolderGit2, Globe, Presentation, Video } from "lucide-react";

interface TopLink {
  label: string;
  href: string;
  Icon: typeof Globe;
}

const LINKS: TopLink[] = [
  {
    label: "Live site",
    href: "https://breeja-frontend.vercel.app/",
    Icon: Globe,
  },
  {
    label: "Pitch deck",
    href: "https://docs.google.com/presentation/d/1Uz701EtaVXlCI3QkhYeWl4SV9VPj8FuF/edit?usp=sharing&ouid=114786194621053890385&rtpof=true&sd=true",
    Icon: Presentation,
  },
  {
    label: "Demo video",
    href: "https://youtu.be/pOrM9hVgczU",
    Icon: Video,
  },
  {
    label: "GitHub",
    href: "https://github.com/Breeja-HQ/Breeja",
    Icon: FolderGit2,
  },
];

export default function TopLinksBar() {
  return (
    <div className="w-full bg-badge-bg border-b border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-2.5 text-base">
          <span className="font-semibold text-ink">ETHGlobal submission</span>

          {LINKS.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-accent hover:text-ink transition-colors"
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{label}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
