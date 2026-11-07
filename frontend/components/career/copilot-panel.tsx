"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  LoaderCircle,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { chatAboutJob, chatWithResume } from "@/lib/api";
import { useCareerStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  message: z.string().trim().min(1, "Write a question first.").max(3000, "Keep your question under 3,000 characters."),
});
type ChatForm = z.infer<typeof schema>;

export function CopilotPanel() {
  const selectedJob = useCareerStore((state) => state.selectedJob);
  const setTab = useCareerStore((state) => state.setTab);
  const [resumeMode, setResumeMode] = useState(false);
  const [answer, setAnswer] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ChatForm>({ resolver: zodResolver(schema) });
  const isResumeChat = resumeMode || !selectedJob;
  const suggestions = isResumeChat
    ? [
        "What are my strongest skills?",
        "Summarize my experience",
        "What achievements stand out?",
      ]
    : [
        "How well does my experience match?",
        "What should I prepare for an interview?",
        "Which skills should I highlight?",
      ];

  const onSubmit = handleSubmit(async ({ message }) => {
    setBusy(true);
    setNotice("");
    setAnswer("");
    try {
      const result = isResumeChat
        ? await chatWithResume(message)
        : await chatAboutJob(selectedJob.id, message);
      setAnswer(result.answer);
      reset();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The assistant could not respond.");
    } finally {
      setBusy(false);
    }
  });

  return (
    <div className="page-enter mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge className="mb-3 bg-primary/10 text-primary"><Sparkles className="mr-1.5 size-3.5" />Your private career assistant</Badge>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.8rem]">Career copilot</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Thoughtful guidance, grounded in your own experience.</p>
        </div>
        <Button variant="outline" onClick={() => selectedJob ? setTab("jobs") : setTab("resume")}>
          <ArrowLeft className="size-4" /> Back to {selectedJob ? "jobs" : "resume"}
        </Button>
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="relative overflow-hidden border-b border-border/70 bg-linear-to-br from-white via-white to-violet-50/80 p-6 sm:p-8">
          <div className="soft-grid absolute right-0 top-0 h-full w-1/3 opacity-40" />
          <div className="relative flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-violet-400 text-white shadow-[0_8px_18px_rgb(101_88_211/25%)]">
              {isResumeChat ? <MessageCircle className="size-5" /> : <BriefcaseBusiness className="size-5" />}
            </div>
            <div className="min-w-0">
              <Badge className="mb-2 border border-emerald-200 bg-emerald-50 text-emerald-700"><ShieldCheck className="mr-1 size-3.5" />Grounded in your data</Badge>
              <CardTitle className="text-xl">{isResumeChat ? "Chat with your resume" : selectedJob.title}</CardTitle>
              <CardDescription className="mt-1.5 max-w-xl leading-6">
                {isResumeChat
                  ? "Ask about your experience, skills, achievements, or how to describe your work."
                  : [selectedJob?.company, selectedJob?.location].filter(Boolean).join(" · ") || "Ask about fit, interview preparation, or how to tailor your application."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-8">
          {!answer && !notice && (
            <div className="mb-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">A few ideas to get started</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setValue("message", suggestion, { shouldValidate: true })}
                    className="rounded-full border bg-white px-3.5 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          <form onSubmit={onSubmit} className="space-y-3">
            <label htmlFor="copilot-message" className="sr-only">Your question</label>
            <Textarea
              id="copilot-message"
              placeholder={isResumeChat
                ? "What are my strongest skills for a team lead role?"
                : "Which parts of my experience best match this role?"}
              aria-invalid={Boolean(errors.message)}
              {...register("message")}
              className="min-h-32 resize-y rounded-2xl bg-slate-50/70 p-4 leading-6 focus-visible:bg-white"
            />
            {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="size-3.5 text-emerald-600" /> Your question stays on this device.
              </p>
              <Button type="submit" disabled={busy}>
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
              {busy ? "Thinking..." : "Ask LocalMind"}
              </Button>
            </div>
          </form>
          {notice && <p className="mt-4 rounded-xl border border-destructive/20 bg-red-50 px-4 py-3 text-sm text-destructive" role="alert">{notice}</p>}
          {answer && (
            <section className="markdown-answer mt-7 max-w-none rounded-2xl border bg-linear-to-br from-white to-violet-50/50 p-5 text-sm leading-7 sm:p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><span className="flex size-7 items-center justify-center rounded-lg bg-primary/10"><Sparkles className="size-4 text-primary" /></span> LocalMind</h2>
              <ReactMarkdown>{answer}</ReactMarkdown>
            </section>
          )}
        </CardContent>
      </Card>
      {selectedJob && (
        <Button
          variant="ghost"
          onClick={() => setResumeMode((current) => !current)}
        >
          {resumeMode ? "Ask about this role instead" : "Ask about my resume instead"}
        </Button>
      )}
    </div>
  );
}
