"use client";

import { BriefcaseBusiness, FileText, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CopilotPanel } from "@/components/career/copilot-panel";
import { JobsPanel } from "@/components/career/jobs-panel";
import { ResumePanel } from "@/components/career/resume-panel";
import { Badge } from "@/components/ui/badge";
import { checkHealth, getProfile } from "@/lib/api";
import { useCareerStore, type WorkspaceTab } from "@/lib/store";
import { cn } from "@/lib/utils";

const navigation: Array<{
  id: WorkspaceTab;
  label: string;
  icon: typeof FileText;
}> = [
  { id: "resume", label: "My resume", icon: FileText },
  { id: "jobs", label: "Discover jobs", icon: BriefcaseBusiness },
  { id: "copilot", label: "Career copilot", icon: MessageCircle },
];

export default function Home() {
  const tab = useCareerStore((state) => state.tab);
  const setTab = useCareerStore((state) => state.setTab);
  const setProfile = useCareerStore((state) => state.setProfile);
  const [serviceStatus, setServiceStatus] = useState<
    "checking" | "ready" | "offline" | "qdrant-offline"
  >("checking");

  useEffect(() => {
    let active = true;
    async function loadWorkspace() {
      try {
        const health = await checkHealth();
        if (!active) return;
        setServiceStatus(health.qdrant_connected ? "ready" : "qdrant-offline");
        if (health.resume_uploaded) {
          try {
            const profile = await getProfile();
            if (active) setProfile(profile);
          } catch {
            if (active) setServiceStatus("offline");
          }
        }
      } catch {
        if (active) setServiceStatus("offline");
      }
    }
    void loadWorkspace();
    return () => {
      active = false;
    };
  }, [setProfile]);

  const panels = {
    resume: <ResumePanel />,
    jobs: <JobsPanel />,
    copilot: <CopilotPanel />,
  };
  const statusLabel = {
    checking: "Checking local services",
    ready: "Local services ready",
    offline: "Backend unavailable",
    "qdrant-offline": "Qdrant unavailable",
  }[serviceStatus];

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1360px] items-center justify-between px-4 sm:px-8">
          <Link className="flex items-center gap-3" href="/" aria-label="LocalMind Career AI home">
            <span className="flex size-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-primary to-violet-400 text-primary-foreground shadow-[0_5px_16px_rgb(101_88_211/25%)]">
              <Sparkles className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight">LocalMind</span>
              <span className="block text-[11px] text-muted-foreground">Career AI</span>
            </span>
          </Link>
          <Badge
            variant="outline"
            className={cn(
              "hidden sm:inline-flex",
              serviceStatus === "ready" &&
                "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
              (serviceStatus === "offline" || serviceStatus === "qdrant-offline") &&
                "border-destructive/30 text-destructive",
            )}
          >
            <span
              className={cn(
                "mr-2 size-1.5 rounded-full bg-muted-foreground",
                serviceStatus === "ready" && "bg-emerald-500",
                (serviceStatus === "offline" || serviceStatus === "qdrant-offline") &&
                  "bg-destructive",
              )}
            />
            {statusLabel}
          </Badge>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1360px] gap-6 px-4 py-6 sm:px-8 md:grid-cols-[200px_minmax(0,1fr)] md:gap-10 md:py-10">
        <aside>
          <nav
            aria-label="Main navigation"
            className="flex gap-2 overflow-x-auto md:sticky md:top-24 md:flex-col"
          >
            {navigation.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={tab === id ? "page" : undefined}
                onClick={() => setTab(id)}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-muted-foreground transition-all hover:bg-white/70 hover:text-foreground md:px-3",
                  tab === id && "bg-white text-primary shadow-[0_4px_18px_rgb(22_28_45/7%)] ring-1 ring-border/70 hover:bg-white hover:text-primary",
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
            <div className="mt-5 hidden rounded-2xl border bg-white/70 p-4 text-xs leading-5 text-muted-foreground shadow-sm md:block">
              <p className="font-semibold text-foreground">Private by design</p>
              <p className="mt-1">Resume analysis, embeddings, and chat stay on your machine.</p>
              <p className="mt-2">Arbeitnow receives no resume data. Job matching runs locally.</p>
            </div>
          </nav>
        </aside>
        <section className="min-w-0" aria-live="polite">
          {panels[tab]}
          <footer className="mt-10 border-t border-border/70 pt-5 text-center text-xs text-muted-foreground">
            Arbeitnow job listings · Local Ollama · SQLite profile store · Qdrant semantic search
          </footer>
        </section>
      </div>
    </main>
  );
}
