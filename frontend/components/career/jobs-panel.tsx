"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { discoverJobs, type Job } from "@/lib/api";
import { useCareerStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const schema = z.object({
  role: z.string().trim().min(2, "Enter at least 2 characters.").max(120),
  country: z.string().trim().min(2, "Enter a country or location.").max(80),
  keywords: z.string().max(250, "Keep keywords under 250 characters."),
});
type SearchForm = z.infer<typeof schema>;

function JobCard({ job }: { job: Job }) {
  const selectJob = useCareerStore((state) => state.selectJob);
  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_14px_38px_rgb(30_36_70/8%)]">
      <CardContent className="p-0">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
          <div className="flex min-w-0 flex-1 gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary/10 to-sky-50 text-primary ring-1 ring-primary/10">
              <Building2 className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold leading-6 tracking-[-0.01em] group-hover:text-primary">{job.title}</h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
                {job.company && <span>{job.company}</span>}
                {job.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{job.location}</span>}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {job.remote && <Badge className="bg-emerald-50 text-emerald-700"><CheckCircle2 className="mr-1 size-3" />Remote</Badge>}
                {job.job_types.slice(0, 2).map((type) => <Badge key={type} variant="outline"><Clock3 className="mr-1 size-3" />{type}</Badge>)}
                {job.tags.slice(0, 2).map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
              </div>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{job.content}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start rounded-xl bg-primary/5 px-3 py-2 sm:flex-col sm:gap-0 sm:px-4 sm:py-3 sm:text-center">
            <span className="text-xl font-semibold tracking-tight text-primary">{job.match_score}%</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">match</span>
          </div>
        </div>
        {job.match_reason && (
          <div className="mx-5 mb-4 flex gap-2 rounded-xl bg-muted/60 px-3.5 py-3 text-xs leading-5 text-muted-foreground sm:mx-6">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>{job.match_reason}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-slate-50/60 px-5 py-3.5 sm:px-6">
          <Button size="sm" onClick={() => selectJob(job)}>
            <Sparkles className="size-3.5" /> Ask about this role
          </Button>
          {job.url && (
            <a
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View original listing <ArrowUpRight className="size-3.5" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function JobsPanel() {
  const profile = useCareerStore((state) => state.profile);
  const jobs = useCareerStore((state) => state.jobs);
  const setJobs = useCareerStore((state) => state.setJobs);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SearchForm>({
    resolver: zodResolver(schema),
    defaultValues: { role: "Senior Software Engineer", country: "Global", keywords: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setBusy(true);
    setNotice("");
    setJobs([]);
    try {
      const result = await discoverJobs(values);
      setJobs(result.jobs);
      setNotice(result.warning || `Found ${result.count} opportunities. Scores are based on role, location, and resume skill overlap.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Job search failed.");
    } finally {
      setBusy(false);
    }
  });

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge className="mb-3 bg-primary/10 text-primary"><BriefcaseBusiness className="mr-1.5 size-3.5" />Curated for your next move</Badge>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.8rem]">Discover your next role</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted-foreground">
          Recent listings are ranked locally by your target role, location, and resume skills.
          </p>
        </div>
        {jobs.length > 0 && <Badge variant="outline" className="bg-white px-3 py-1.5">{jobs.length} relevant listings</Badge>}
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-linear-to-r from-white to-violet-50/50 pb-5">
          <CardTitle className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Search className="size-4" /></span>Search preferences</CardTitle>
          <CardDescription>Arbeitnow provides live listings. Resume details stay local while listings are matched on your machine.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1.5 text-sm font-medium">
              Target role
              <Input placeholder="Senior Software Engineer" {...register("role")} aria-invalid={Boolean(errors.role)} />
              {errors.role && <span className="text-xs text-destructive">{errors.role.message}</span>}
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Country or location
              <Input placeholder="Global" {...register("country")} aria-invalid={Boolean(errors.country)} />
              {errors.country && <span className="text-xs text-destructive">{errors.country.message}</span>}
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Extra keywords
              <Input placeholder="Remote, visa sponsorship..." {...register("keywords")} aria-invalid={Boolean(errors.keywords)} />
              {errors.keywords && <span className="text-xs text-destructive">{errors.keywords.message}</span>}
            </label>
            <div className="md:col-span-3">
              <Button type="submit" disabled={busy || !profile}>
                {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
                {busy ? "Searching and matching..." : "Find matching jobs"}
              </Button>
              {!profile && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">Analyze a resume before searching for matches.</p>}
            </div>
          </form>
        </CardContent>
      </Card>
      {notice && <p className="text-sm text-muted-foreground" role="status">{notice}</p>}
      <p className="text-xs text-muted-foreground">
        Listings provided by{" "}
        <a
          href="https://www.arbeitnow.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Arbeitnow
        </a>
        .
      </p>
      {jobs.length > 0 ? (
        <div className="grid gap-4">{jobs.map((job) => <JobCard key={job.id} job={job} />)}</div>
      ) : (
        <Card className="overflow-hidden border-dashed bg-white/70 shadow-none">
          <CardContent className="soft-grid flex flex-col items-center py-14 text-center">
            <span className="mb-4 flex size-14 items-center justify-center rounded-[1.25rem] bg-white text-primary shadow-sm ring-1 ring-border/70"><BriefcaseBusiness className="size-6" /></span>
            <CardTitle className="text-base">Your next opportunity starts here</CardTitle>
            <CardDescription className="mt-1.5 max-w-sm leading-6">Search above to see recent openings ranked against your role, location, and experience.</CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
