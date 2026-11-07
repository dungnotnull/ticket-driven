import { z } from "zod";
import { ApiError } from "@/lib/api";
import { getProjectAccess } from "@/lib/rbac";
import type { SessionUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getTicketOrThrow } from "@/lib/services/tickets";

/* ------------------------------- DTOs ------------------------------ */

export interface AiSuggestionDTO {
  target: string;
  issue: string;
  suggestion: string;
}

export interface AiReviewDTO {
  score: number;
  summary: string;
  suggestions: AiSuggestionDTO[];
}

/** Shown verbatim in the UI whenever upstream AI is not usable. */
export const AI_MAINTENANCE_MESSAGE = "AI assistant is temporarily unavailable (maintenance).";

function aiUnavailable(): ApiError {
  return new ApiError(503, AI_MAINTENANCE_MESSAGE);
}

/* ----------------------- response validation ---------------------- */

const suggestionSchema = z.object({
  target: z.string().min(1).max(160),
  issue: z.string().min(1).max(400),
  suggestion: z.string().min(1).max(500),
});

const responseSchema = z.object({
  score: z.number().int().min(0).max(100),
  summary: z.string().min(1).max(1200),
  suggestions: z.array(suggestionSchema).max(8),
});

/* ------------------------------- prompt ---------------------------- */

function buildPrompt(payload: string): string {
  return [
    "You are a senior delivery lead reviewing work-item quality inside a project",
    "management tool (Kanban tickets with client verification questions).",
    "Evaluate the CLARITY and ACTIONABILITY of the ticket content and the",
    "question/option design below. Do NOT invent facts. Suggestions must be",
    "concrete rewrites the author could apply, never destructive.",
    "",
    "Score = overall content quality from 0 (unclear) to 100 (excellent).",
    "Summary = 2-3 short sentences.",
    "Max 6 suggestions. Respond with ONLY valid JSON:",
    '{"score": <int 0-100>, "summary": "<string>", "suggestions": [{"target": "<description | question N | option ...>", "issue": "<string>", "suggestion": "<string>"}]}',
    "",
    "CONTENT TO REVIEW:",
    payload,
  ].join("\n");
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw aiUnavailable();
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    throw aiUnavailable();
  }
}

/* ------------------------------ service ---------------------------- */

/**
 * One-shot Gemini call that reviews the ticket description plus its client
 * questions/options and returns read-only suggestions. Failures NEVER
 * propagate as unexpected errors - everything becomes an ApiError(503) with
 * the maintenance message so the UI toasts it calmly.
 */
export async function reviewTicketContent(
  user: SessionUser,
  ticketId: string,
): Promise<AiReviewDTO> {
  await connectDB();
  const ticket = await getTicketOrThrow(ticketId);
  // AI review is an internal quality tool - admin/team (write) only.
  await getProjectAccess(ticket.projectId.toString(), "write", user);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length < 20) throw aiUnavailable();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";

  const lines: string[] = [
    `TITLE: ${ticket.title}`,
    `STATUS: ${ticket.status} · PRIORITY: ${ticket.priority}${ticket.dueDate ? ` · DUE: ${new Date(ticket.dueDate).toISOString().slice(0, 10)}` : ""}`,
    `DESCRIPTION:\n${(ticket.description ?? "").slice(0, 4000) || "(empty)"}`,
  ];
  const questions = (ticket.questions ?? []) as Array<{
    prompt?: string;
    type?: string;
    required?: boolean;
    allowMultiple?: boolean;
    options?: string[];
    textOptionIndexes?: number[];
  }>;
  questions.forEach((q, i) => {
    lines.push(
      `QUESTION ${i + 1} (${q.type}${q.required ? ", required" : ""}${q.allowMultiple ? ", multi-select" : ""}): ${(q.prompt ?? "").slice(0, 300)}`,
    );
    (q.options ?? []).forEach((opt: string, j: number) => {
      const withText = (q.textOptionIndexes ?? []).includes(j);
      lines.push(`  - option ${j + 1}: ${opt}${withText ? " [asks for a text note]" : ""}`);
    });
  });
  if ((ticket.questions ?? []).length === 0) lines.push("QUESTIONS: (none attached)");
  void questions;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(lines.join("\n")) }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1200, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    },
  ).catch(() => {
    throw aiUnavailable();
  });

  if (!response.ok) throw aiUnavailable();

  const data = (await response.json().catch(() => null)) as
    | { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    | null;
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
  if (!text) throw aiUnavailable();

  const parsed = responseSchema.safeParse(extractJson(text));
  if (!parsed.success) throw aiUnavailable();
  return parsed.data;
}
