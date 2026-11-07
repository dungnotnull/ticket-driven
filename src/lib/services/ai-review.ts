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
 * Live model chain: `GEMINI_MODEL` first, then `GEMINI_MODEL_FALLBACKS`
 * (comma-separated). Free-tier quota is counted PER MODEL, so when the
 * primary lite model hits its rate limit (429) the next model in the chain
 * serves the request instead of degrading the feature.
 */
function modelChain(): string[] {
  const chain: string[] = [];
  const primary = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  chain.push(primary);
  for (const raw of (process.env.GEMINI_MODEL_FALLBACKS ?? "").split(",")) {
    const name = raw.trim();
    if (name && !chain.includes(name)) chain.push(name);
  }
  return chain;
}

/**
 * One-shot Gemini call that reviews the ticket description plus its client
 * questions/options and returns read-only suggestions. Failures NEVER
 * propagate as unexpected errors - everything eventually becomes an
 * ApiError(503) with the maintenance message so the UI toasts it calmly.
 * The call ROTATES through the model chain on retryable failures (429 rate
 * limit, 404 model unavailable, 5xx, network, empty/malformed output);
 * 400/401/403 are key/request problems that rotation cannot fix - those
 * stop immediately with the maintenance 503.
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

  const body = JSON.stringify({
    contents: [{ parts: [{ text: buildPrompt(lines.join("\n")) }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 1200, responseMimeType: "application/json" },
  });

  let text = "";
  for (const model of modelChain()) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body,
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      },
    ).catch(() => null);

    if (!response || !response.ok) {
      const status = response?.status ?? 0;
      // 400/401/403: bad request or key/auth problem - identical for every
      // model, rotating cannot help -> stop with the calm 503.
      if (status === 400 || status === 401 || status === 403) throw aiUnavailable();
      if (status) {
        console.warn(`[ai-review] model ${model} unavailable (status ${status}) - rotating to next candidate`);
      } else {
        console.warn(`[ai-review] model ${model} network error - rotating to next candidate`);
      }
      continue;
    }

    const data = (await response.json().catch(() => null)) as
      | { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
      | null;
    const candidate =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
    if (!candidate) {
      console.warn(`[ai-review] model ${model} returned an empty candidate - rotating`);
      continue;
    }
    text = candidate;
    break;
  }

  if (!text) throw aiUnavailable();

  const parsed = responseSchema.safeParse(extractJson(text));
  if (!parsed.success) throw aiUnavailable();
  return parsed.data;
}
