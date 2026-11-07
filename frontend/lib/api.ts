export type Profile = {
  headline?: string;
  experience_years?: number;
  skills?: string[];
  roles?: string[];
  summary?: string;
  resume_filename?: string;
};

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  job_types: string[];
  tags: string[];
  url: string;
  content: string;
  match_score: number;
  match_reason: string;
  gaps?: string[];
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}/api${path}`, init);
  const data = (await response.json().catch(() => ({}))) as {
    detail?: string;
  };
  if (!response.ok) {
    throw new Error(data.detail || `Request failed (${response.status})`);
  }
  return data as T;
}

export async function uploadResume(file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<{ profile: Profile }>("/resume", { method: "POST", body: form });
}

export function discoverJobs(input: {
  role: string;
  country: string;
  keywords: string;
}) {
  return request<{ jobs: Job[]; count: number; warning?: string }>("/jobs/discover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function chatWithResume(message: string) {
  return request<{ answer: string }>("/resume/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
}

export function chatAboutJob(job_id: string, message: string) {
  return request<{ answer: string }>("/jobs/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id, message }),
  });
}

export function checkHealth() {
  return request<{
    status: string;
    qdrant_connected: boolean;
    resume_uploaded: boolean;
  }>("/health");
}

export function getProfile() {
  return request<Profile>("/profile");
}
