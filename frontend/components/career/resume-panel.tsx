"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Check,
  FileCheck2,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { uploadResume } from "@/lib/api";
import { useCareerStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const schema = z.object({
  file: z
    .custom<File>((value) => typeof File !== "undefined" && value instanceof File, {
      message: "Choose a resume file to continue.",
    })
    .refine((file) => file.size <= 10 * 1024 * 1024, "Maximum file size is 10 MB.")
    .refine(
      (file) => /\.(pdf|docx|txt)$/i.test(file.name),
      "Use a PDF, DOCX, or TXT file.",
    ),
});

type ResumeForm = z.infer<typeof schema>;

export function ResumePanel() {
  const profile = useCareerStore((state) => state.profile);
  const setProfile = useCareerStore((state) => state.setProfile);
  const setTab = useCareerStore((state) => state.setTab);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResumeForm>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ file }) => {
    setBusy(true);
    setNotice("");
    try {
      const result = await uploadResume(file);
      setProfile(result.profile);
      setNotice("Resume analyzed and indexed locally.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Resume upload failed.");
    } finally {
      setBusy(false);
    }
  });

  return (
    <div className="page-enter space-y-6">
      <Card className="relative overflow-hidden border-0 bg-linear-to-br from-white via-white to-violet-50/80">
        <div className="soft-grid absolute inset-y-0 right-0 hidden w-[42%] opacity-60 md:block" />
        <div className="relative grid gap-8 p-6 md:grid-cols-[1fr_auto] md:p-9">
          <div className="max-w-2xl">
            <Badge className="mb-5 border border-primary/15 bg-primary/10 text-primary">
              <Sparkles className="mr-1.5 size-3.5" /> Your career, in focus
            </Badge>
            <h1 className="max-w-xl text-3xl font-semibold leading-[1.12] tracking-[-0.04em] sm:text-[2.65rem]">
              Your next chapter starts <span className="text-primary">with you.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
              Turn your experience into a clearer career story. Understand your
              strengths, find relevant openings, and prepare for the next step.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-2"><span className="flex size-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="size-3.5" /></span>Private resume analysis</span>
              <span className="inline-flex items-center gap-2"><span className="flex size-6 items-center justify-center rounded-full bg-violet-50 text-primary"><Check className="size-3.5" /></span>Personalized matches</span>
            </div>
          </div>
          <div className="relative hidden w-48 items-center justify-center md:flex">
            <div className="absolute size-40 rounded-full bg-violet-200/50 blur-2xl" />
            <div className="relative flex size-36 rotate-[-4deg] items-center justify-center rounded-4xl border border-white bg-white/80 text-primary shadow-[0_20px_50px_rgb(67_56_130/15%)]">
              <FileText className="size-16 stroke-[1.2]" />
              <span className="absolute -bottom-2 -right-2 flex size-11 items-center justify-center rounded-2xl bg-primary text-white shadow-lg">
                <Sparkles className="size-5" />
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileCheck2 className="size-5" /></span>
            <div>
              <CardTitle>Start with your resume</CardTitle>
              <CardDescription className="mt-1.5">
                We’ll turn it into a private, searchable career profile.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="relative">
              <Controller
                name="file"
                control={control}
                render={({ field: { onChange, ref, value, ...field } }) => (
                  <label className="dropzone-glow group relative flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/25 px-5 py-7 text-center transition-all hover:border-primary/50 hover:bg-violet-50/70 focus-within:ring-2 focus-within:ring-ring">
                    <Input
                      {...field}
                      ref={ref}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      aria-invalid={Boolean(errors.file)}
                      value={undefined}
                      onChange={(event) => onChange(event.target.files?.[0])}
                      className="absolute inset-0 z-10 h-full cursor-pointer opacity-0"
                    />
                    <span className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-white text-primary shadow-sm ring-1 ring-border/70 transition-transform group-hover:-translate-y-0.5">
                      <Upload className="size-5" />
                    </span>
                    <span className="text-sm font-semibold">Choose a resume to upload</span>
                    <span className="mt-1.5 text-xs text-muted-foreground">
                      {value?.name ?? "PDF, DOCX, or TXT · up to 10 MB"}
                    </span>
                  </label>
                )}
              />
              {errors.file && (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {errors.file.message}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <LockKeyhole className="size-3.5" /> Your resume stays on your device.
              </p>
              <Button type="submit" disabled={busy} className="min-w-40">
                {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {busy ? "Analyzing locally..." : "Analyze resume"}
              </Button>
            </div>
          </form>
          {notice && (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700" role="status">
              <Check className="size-4 shrink-0" /> {notice}
            </p>
          )}
        </CardContent>
      </Card>

      {profile && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary/15 to-sky-100 text-primary">
                  <FileText className="size-5" />
                </span>
                <div>
                  <Badge className="mb-2 bg-emerald-50 text-emerald-700">Profile ready</Badge>
                  <CardTitle>{profile.headline || "Candidate profile"}</CardTitle>
                  <CardDescription className="mt-1.5">
                    {profile.experience_years ?? "—"} years experience
                    {profile.resume_filename ? ` · ${profile.resume_filename}` : ""}
                  </CardDescription>
                </div>
              </div>
              <Button onClick={() => setTab("jobs")}>
                Explore matching roles <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {profile.summary && (
              <p className="rounded-xl bg-muted/70 p-4 text-sm leading-7 text-muted-foreground">
                {profile.summary}
              </p>
            )}
            {!!profile.roles?.length && (
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.roles.map((role) => <Badge key={role} variant="outline">{role}</Badge>)}
              </div>
            )}
            {!!profile.skills?.length && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-medium">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => <Badge key={skill}>{skill}</Badge>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
