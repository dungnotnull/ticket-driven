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
  return new ApiError(503, AI_MAINTENANCE_MESSAGE, "AI_MAINTENANCE");
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

/** API-key chain: `GEMINI_API_KEY` (key 1) then optional `GEMINI_API_KEY_2`. */
function apiKeyChain(): string[] {
  const keys: string[] = [];
  for (const raw of [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2]) {
    const key = raw?.trim();
    if (key && key.length >= 20 && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

/** Result of one Gemini call attempt against a specific key + model. */
interface ModelCallResult {
  kind: "ok" | "rotate-model" | "rotate-key" | "fatal";
  text?: string;
}

async function callModelOnce(
  model: string,
  apiKey: string,
  body: string,
): Promise<ModelCallResult> {
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

  if (!response) return { kind: "rotate-model" }; // network error -> next model
  if (response.ok) {
    const data = (await response.json().catch(() => null)) as
      | { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
      | null;
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
    return text ? { kind: "ok", text } : { kind: "rotate-model" }; // empty candidate -> next model
  }

  const status = response.status;
  // 429 quota (per key + model), 404 unknown model, 403 model/permission
  // restricted, 5xx upstream - the SAME key may still serve with another
  // model, so keep rotating models first; the key chain handles leftovers.
  if (status === 429 || status === 404 || status === 403 || status >= 500) {
    return { kind: "rotate-model" };
  }
  if (status === 401) return { kind: "rotate-key" }; // key-level auth failure
  if (status === 400) {
    // Distinguish a bad KEY from a bad REQUEST: Google returns 400 with
    // "API key not valid"/API_KEY_INVALID for rejected keys - those rotate
    // to the next key; genuine payload errors cannot be fixed by rotating.
    const err = (await response.json().catch(() => null)) as
      | { error?: { status?: string; message?: string } }
      | null;
    const detail = `${err?.error?.status ?? ""} ${err?.error?.message ?? ""}`;
    return /API_KEY_INVALID|api key/i.test(detail)
      ? { kind: "rotate-key" }
      : { kind: "fatal" };
  }
  return { kind: "fatal" };
}

/**
 * One-shot Gemini call that reviews the ticket description plus its client
 * questions/options and returns read-only suggestions. The call ROTATES
 * through the model chain per key, then through the API-key chain
 * (key 1 -> key 2) - free-tier quota is per model AND per key. Failures
 * NEVER propagate as unexpected errors: if every key/model combination
 * is exhausted the caller receives ONLY the calm ApiError(503) so the UI
 * toasts the maintenance message - no page or flow is ever broken.
 */
export async function reviewTicketContent(
  user: SessionUser,
  ticketId: string,
): Promise<AiReviewDTO> {
  await connectDB();
  const ticket = await getTicketOrThrow(ticketId);
  // AI review is an internal quality tool - admin/team (write) only.
  await getProjectAccess(ticket.projectId.toString(), "write", user);

  const keys = apiKeyChain();
  if (keys.length === 0) throw aiUnavailable();

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

  const models = modelChain();
  let text = "";
  keyLoop: for (let k = 0; k < keys.length; k++) {
    const key = keys[k];
    for (const model of models) {
      const result = await callModelOnce(model, key, body);
      if (result.kind === "ok") {
        text = result.text ?? "";
        break keyLoop;
      }
      if (result.kind === "rotate-model") {
        console.warn(`[ai-review] key ${k + 1} model ${model} unavailable - rotating to next candidate model`);
        continue;
      }
      if (result.kind === "rotate-key") {
        console.warn(`[ai-review] key ${k + 1} rejected at key level - switching to the next API key`);
        break;
      }
      console.warn(`[ai-review] key ${k + 1} model ${model} request failed terminally`);
      throw aiUnavailable();
    }
  }

  if (!text) throw aiUnavailable();

  const parsed = responseSchema.safeParse(extractJson(text));
  if (!parsed.success) throw aiUnavailable();
  return parsed.data;
}
