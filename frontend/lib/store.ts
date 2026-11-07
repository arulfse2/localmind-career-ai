"use client";

import { create } from "zustand";

import type { Job, Profile } from "@/lib/api";

export type WorkspaceTab = "resume" | "jobs" | "copilot";

type CareerState = {
  tab: WorkspaceTab;
  profile: Profile | null;
  jobs: Job[];
  selectedJob: Job | null;
  setTab: (tab: WorkspaceTab) => void;
  setProfile: (profile: Profile) => void;
  setJobs: (jobs: Job[]) => void;
  selectJob: (job: Job) => void;
};

export const useCareerStore = create<CareerState>((set) => ({
  tab: "resume",
  profile: null,
  jobs: [],
  selectedJob: null,
  setTab: (tab) => set({ tab }),
  setProfile: (profile) => set({ profile }),
  setJobs: (jobs) => set({ jobs, selectedJob: null }),
  selectJob: (selectedJob) => set({ selectedJob, tab: "copilot" }),
}));
