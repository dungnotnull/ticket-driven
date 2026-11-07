/**
 * Seed script for DymTicket demo data.
 * Usage: npm run seed [-- --force]   (FORCE=1 also works)
 *
 * Creates demo users, two projects, and tickets with a realistic activity
 * history that exercises the client review workflow.
 *
 * Idempotent: exits early when the admin account already exists unless forced.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Minimal .env.local loader (no dependency on dotenv).
try {
  const envPath = resolve(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match && !line.trimStart().startsWith("#") && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
} catch {
  /* no .env.local — fall back to process env */
}

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/kanban";
const FORCE = process.env.FORCE === "1" || process.argv.includes("--force");

async function main() {
  const connection = await mongoose
    .connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB || "kanban",
    })
    .then((m) => m.connection);

  const users = connection.collection("users");
  const projects = connection.collection("projects");
  const tickets = connection.collection("tickets");

  const adminEmail = "admin@orcaboard.dev";
  const existing = await users.findOne({ email: adminEmail });
  if (existing && !FORCE) {
    console.log(`[seed] '${adminEmail}' already exists — nothing to do.`);
    console.log("[seed] Use --force to wipe kanban* data and reseed.");
    await connection.close();
    return;
  }

  if (FORCE) {
    await Promise.all([
      users.deleteMany({}),
      projects.deleteMany({}),
      tickets.deleteMany({}),
    ]);
    console.log("[seed] force wipe complete");
  }

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const userDocs = [
    { name: "Dana Admin", email: adminEmail, globalRole: "admin" },
    { name: "Alex Rivera", email: "alex@orcaboard.dev", globalRole: "team" },
    { name: "Maya Chen", email: "maya@orcaboard.dev", globalRole: "team" },
    { name: "Sophia Laurent", email: "sophia@acmestudio.co", globalRole: "client" },
    { name: "Leo Park", email: "leo@acmestudio.co", globalRole: "client" },
  ];

  const inserted = [];
  for (const user of userDocs) {
    const result = await users.insertOne({
      name: user.name,
      email: user.email,
      passwordHash,
      globalRole: user.globalRole,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    inserted.push({ ...user, _id: result.insertedId });
  }

  const [dana, alex, maya, sophia, leo] = inserted;
  void dana;

  function find(email) {
    return inserted.find((u) => u.email === email);
  }

  /* ------------------------------ projects ------------------------------ */

  const websiteId = (
    await projects.insertOne({
      name: "Website Redesign",
    description:
      "Marketing site refresh: new landing pages, pricing section, and a lighter design system.",
    ownerId: alex._id,
    backgroundUrl:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&q=80",
    members: [
      { userId: alex._id, role: "admin", addedAt: new Date() },
      { userId: maya._id, role: "team", addedAt: new Date() },
      { userId: sophia._id, role: "client", addedAt: new Date() },
      { userId: leo._id, role: "client", addedAt: new Date() },
    ],
    createdAt: new Date(Date.now() - 6 * 86400000),
    updatedAt: new Date(),
    })
  ).insertedId;

  const mobileId = (
    await projects.insertOne({
      name: "Mobile App MVP",
      description: "iOS/Android MVP with onboarding, sessions and push notifications.",
      ownerId: maya._id,
      members: [
        { userId: maya._id, role: "admin", addedAt: new Date() },
        { userId: alex._id, role: "team", addedAt: new Date() },
        { userId: sophia._id, role: "client", addedAt: new Date() },
      ],
      createdAt: new Date(Date.now() - 4 * 86400000),
      updatedAt: new Date(),
    })
  ).insertedId;

  /* ------------------------------- tickets ------------------------------ */

  function activity(entry) {
    return {
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(entry.createdAt ?? Date.now()),
      ...entry,
      actorId: entry.actorId,
    };
  }

  const actorFor = (email) => find(email)._id;

  async function makeTicket(projectId, spec) {
    const createdById = actorFor(spec.createdBy);
    const actorName = find(spec.createdBy).name;
    const now = Date.now();
    const base = {
      projectId,
      title: spec.title,
      description: spec.description ?? "",
      status: spec.status,
      order: spec.order ?? 0,
      assigneeId: spec.assignee ? actorFor(spec.assignee) : null,
      priority: spec.priority ?? "medium",
      dueDate: spec.dueDate ? new Date(spec.dueDate) : null,
      attachments: [],
      createdById,
      createdAt: new Date(now - (spec.ageDays ?? 2) * 86400000),
      updatedAt: new Date(now - (spec.ageHrs ?? 5) * 3600000),
    };

    const log = [
      activity({
        type: "created",
        actorId: createdById,
        actorName,
        createdAt: new Date(now - (spec.ageDays ?? 2) * 86400000),
      }),
      ...(spec.moves ?? []).flatMap((move) => [
        activity({
          type: "moved",
          actorId: actorFor(move.by),
          actorName: find(move.by).name,
          from: move.from,
          to: move.to,
          createdAt: new Date(now - move.hrsAgo * 3600000),
        }),
      ]),
      ...(spec.comments ?? []).map((c) =>
        activity({
          type: "comment",
          actorId: actorFor(c.by),
          actorName: find(c.by).name,
          note: c.text,
          createdAt: new Date(now - c.hrsAgo * 3600000),
        }),
      ),
      ...(spec.review
        ? [
            activity({
              type: "review",
              actorId: actorFor(spec.review.by),
              actorName: find(spec.review.by).name,
              from: spec.review.from ?? spec.status,
              to: spec.review.to,
              review: spec.review.decision,
              note: spec.review.note ?? "",
              createdAt: new Date(now - 3 * 3600000),
            }),
          ]
        : []),
    ];

    const review = spec.review
      ? {
          status: spec.review.decision,
          note: spec.review.note ?? "",
          reviewedById: actorFor(spec.review.by),
          reviewedAt: new Date(now - 3 * 3600000),
        }
      : null;

    const questions = (spec.questions ?? []).map((q) => ({
      // The raw driver does not add _id to nested subdocuments — set it here,
      // otherwise Mongoose reads the array as `_id`-less raw objects.
      _id: new mongoose.Types.ObjectId(),
      prompt: q.prompt,
      type: q.type,
      options: q.options ?? [],
      allowMultiple: q.allowMultiple ?? false,
      required: q.required ?? false,
      createdById: actorFor(q.createdBy),
      createdAt: new Date(now - (q.createdHrsAgo ?? 6) * 3600000),
      answers: (q.answers ?? []).map((a) => ({
        userId: actorFor(a.by),
        choiceIndexes: a.choiceIndexes ?? [],
        text: a.text ?? "",
        answeredAt: new Date(now - (a.hrsAgo ?? 2) * 3600000),
      })),
    }));

    await tickets.insertOne({ ...base, activity: log, review, questions });
  }

  const ticketsForWebsite = [
    {
      title: "Design system: colors, spacing, typography tokens",
      description:
        "Define the token set (colors incl. dark mode map, 4px spacing scale, type scale) and publish via Tailwind config. Reference: Figma #design-tokens.",
      status: "done",
      order: 0,
      assignee: "alex@orcaboard.dev",
      priority: "high",
      dueDate: null,
      ageDays: 5,
      ageHrs: 96,
      moves: [
        { by: "alex@orcaboard.dev", from: "in_progress", to: "in_review", hrsAgo: 120 },
      ],
      review: {
        by: "sophia@acmestudio.co",
        decision: "approved",
        from: "in_review",
        to: "done",
        note: "Palette and type scale look great — approved!",
      },
      createdBy: "alex@orcaboard.dev",
    },
    {
      title: "Landing page hero & feature grid",
      description:
        "Build the hero + feature grid from the approved design. Uses the new tokens; includes responsive breakpoints at 768px and 1280px.",
      status: "in_review",
      order: 0,
      assignee: "alex@orcaboard.dev",
      priority: "high",
      ageDays: 4,
      ageHrs: 3,
      moves: [
        { by: "alex@orcaboard.dev", from: "in_progress", to: "in_review", hrsAgo: 20 },
      ],
      comments: [
        {
          by: "leo@acmestudio.co",
          text: "Can we increase the contrast on the secondary CTA? Hard to read on the dark banner.",
          hrsAgo: 3,
        },
      ],
      questions: [
        {
          prompt: "Does the hero use the right red tone for our brand?",
          type: "choice",
          options: ["I don't like it", "Softer red please", "Looks good — keep it", "Other idea (tell us)"],
          allowMultiple: false,
          required: true,
          createdBy: "maya@orcaboard.dev",
          createdHrsAgo: 4,
          answers: [{ by: "sophia@acmestudio.co", choiceIndexes: [2], hrsAgo: 2 }],
        },
        {
          prompt: "Any final tweaks for the feature grid copy before launch?",
          type: "text",
          required: false,
          createdBy: "alex@orcaboard.dev",
          createdHrsAgo: 3,
        },
        {
          prompt: "Which part of the hero needs the most polish?",
          type: "choice",
          options: ["Headline copy", "Color accents", "Spacing & rhythm", "Something else (describe)"],
          allowMultiple: true,
          textOptionIndexes: [3],
          required: false,
          createdBy: "maya@orcaboard.dev",
          createdHrsAgo: 2,
        },
      ],
      createdBy: "maya@orcaboard.dev",
    },
    {
      title: "Pricing section with plan comparison",
      description:
        "Three-tier pricing cards with monthly/annual toggle. Data comes from the shared JSON used by the app.",
      status: "in_progress",
      order: 0,
      assignee: "maya@orcaboard.dev",
      priority: "medium",
      ageDays: 3,
      ageHrs: 8,
      moves: [
        { by: "maya@orcaboard.dev", from: "in_review", to: "in_progress", hrsAgo: 8 },
      ],
      review: {
        by: "sophia@acmestudio.co",
        decision: "changes_requested",
        from: "in_review",
        to: "in_progress",
        note: "Please add the enterprise tier and align toggle labels with our brand wording.",
      },
      comments: [
        {
          by: "maya@orcaboard.dev",
          text: "Copy for enterprise tier incoming — drafting with Legal.",
          hrsAgo: 6,
        },
      ],
      createdBy: "maya@orcaboard.dev",
    },
    {
      title: "Customer logo wall & social proof strip",
      description: "Static logo grid with hover states; lazy-loaded images.",
      status: "todo",
      order: 0,
      assignee: null,
      priority: "low",
      ageDays: 2,
      ageHrs: 20,
      createdBy: "alex@orcaboard.dev",
    },
  ];

  const ticketsForMobile = [
    {
      title: "Onboarding flow: 3 slides + skip",
      description: "Carousels with auto-advance, skip button persists preference locally.",
      status: "done",
      order: 1,
      assignee: "alex@orcaboard.dev",
      priority: "urgent",
      ageDays: 3,
      ageHrs: 48,
      review: {
        by: "sophia@acmestudio.co",
        decision: "approved",
        to: "done",
        note: "",
      },
      createdBy: "maya@orcaboard.dev",
    },
    {
      title: "Session security: refresh token rotation",
      description:
        "Rotate refresh tokens on use, revoke on log-out-all; wireframe: #auth-flow.",
      status: "in_progress",
      order: 1,
      assignee: "maya@orcaboard.dev",
      priority: "high",
      ageDays: 2,
      ageHrs: 6,
      createdBy: "maya@orcaboard.dev",
    },
    {
      title: "Push notification opt-in prompt",
      description: "Trigger after first successful session sync; respects OS-level permissions.",
      status: "todo",
      order: 1,
      assignee: null,
      priority: "medium",
      ageDays: 1,
      ageHrs: 10,
      createdBy: "maya@orcaboard.dev",
    },
  ];

  for (const spec of ticketsForWebsite) {
    await makeTicket(websiteId, spec);
  }
  for (const spec of ticketsForMobile) {
    await makeTicket(mobileId, spec);
  }

  console.log("[seed] done.");
  console.log("");
  console.log("Demo accounts (password: Password123!)");
  console.log("  admin  → admin@orcaboard.dev");
  console.log("  team   → alex@orcaboard.dev, maya@orcaboard.dev");
  console.log("  client → sophia@acmestudio.co, leo@acmestudio.co");

  await connection.close();
}

main().catch((error) => {
  console.error("[seed] failed:", error);
  process.exit(1);
});
