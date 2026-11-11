import { createHash, randomUUID, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultCategories } from "@/lib/defaultCategories";
import { addFamilyMemberRecord } from "@/lib/familyMembers";
import { isKind, QUESTIONNAIRES } from "@/lib/questionnaires";

// Server-to-server entry point for Israel's assistant: create a questionnaire
// link, open a family with portal access, and read who filled what. It never
// sends anything itself - it returns the link and the ready message, and the
// caller delivers them.
//
// Auth is a Bearer key (ASSISTANT_API_KEY), checked here and not by the
// session cookie, so the path is listed in PUBLIC_PATHS. Without a key of at
// least 32 characters on the server the endpoint stays closed.

const MIN_KEY_LENGTH = 32;

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function authError(request: NextRequest): NextResponse | null {
  const key = process.env.ASSISTANT_API_KEY ?? "";
  if (key.length < MIN_KEY_LENGTH) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const header = request.headers.get("authorization") ?? "";
  if (!timingSafeEqual(digest(header), digest(`Bearer ${key}`))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

// The portal has one advisor today. If a second one is ever added, the key
// must say whose it is (ASSISTANT_ADVISOR_EMAIL) rather than guess.
async function getAdvisor() {
  const email = process.env.ASSISTANT_ADVISOR_EMAIL?.trim().toLowerCase();
  if (email) return prisma.advisor.findUnique({ where: { email } });
  const advisors = await prisma.advisor.findMany({ take: 2 });
  return advisors.length === 1 ? advisors[0] : null;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function loginMessage(fullName: string, email: string, loginUrl: string): string {
  return `שלום ${fullName}, זה הקישור לאזור התקציב האישי שלך:\n${loginUrl}\n\nנכנסים עם המייל ${email} ומקבלים קוד כניסה למייל (אם לא מגיע תוך דקה, כדאי לבדוק בספאם). אחרי הכניסה אפשר להוסיף את האתר למסך הבית, ומשם זה נפתח כמו אפליקציה.`;
}

export async function GET(request: NextRequest) {
  const denied = authError(request);
  if (denied) return denied;

  const advisor = await getAdvisor();
  if (!advisor) return NextResponse.json({ error: "advisor_not_found" }, { status: 409 });

  const origin = new URL(request.url).origin;

  const [questionnaires, families] = await Promise.all([
    prisma.mortgageQuestionnaire.findMany({
      where: { advisorId: advisor.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, kind: true, clientName: true, status: true, token: true, createdAt: true, submittedAt: true },
    }),
    prisma.family.findMany({
      where: { advisorId: advisor.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        displayName: true,
        portalActive: true,
        budgetOnly: true,
        welcomedAt: true,
        createdAt: true,
        members: { select: { fullName: true, email: true } },
        _count: { select: { expenses: true } },
        expenses: { orderBy: { occurredAt: "desc" }, take: 1, select: { occurredAt: true } },
      },
    }),
  ]);

  return NextResponse.json({
    questionnaires: questionnaires.map((q) => ({
      id: q.id,
      kind: q.kind,
      clientName: q.clientName,
      status: q.status,
      createdAt: q.createdAt,
      submittedAt: q.submittedAt,
      url: `${origin}/q/${q.token}`,
      reportUrl: `${origin}/admin/mortgage/${q.id}`,
    })),
    families: families.map((f) => ({
      id: f.id,
      displayName: f.displayName,
      portalActive: f.portalActive,
      budgetOnly: f.budgetOnly,
      finishedWelcome: f.welcomedAt !== null,
      createdAt: f.createdAt,
      members: f.members,
      expenseCount: f._count.expenses,
      lastExpenseAt: f.expenses[0]?.occurredAt ?? null,
      adminUrl: `${origin}/admin/families/${f.id}`,
    })),
  });
}

export async function POST(request: NextRequest) {
  const denied = authError(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const advisor = await getAdvisor();
  if (!advisor) return NextResponse.json({ error: "advisor_not_found" }, { status: 409 });

  const origin = new URL(request.url).origin;
  const text = (key: string) => (typeof body[key] === "string" ? (body[key] as string).trim() : "");

  if (body.action === "questionnaire") {
    const clientName = text("clientName");
    const kind = text("kind");
    if (!clientName) return NextResponse.json({ error: "clientName_required" }, { status: 400 });
    if (!isKind(kind)) return NextResponse.json({ error: "kind_must_be_mortgage_or_finance" }, { status: 400 });

    const created = await prisma.mortgageQuestionnaire.create({
      data: {
        advisorId: advisor.id,
        kind,
        clientName,
        clientPhone: text("clientPhone") || null,
        token: randomUUID(),
      },
    });
    const url = `${origin}/q/${created.token}`;
    return NextResponse.json({
      id: created.id,
      kind,
      url,
      reportUrl: `${origin}/admin/mortgage/${created.id}`,
      message: QUESTIONNAIRES[kind].whatsapp(firstName(clientName), url),
    });
  }

  if (body.action === "family") {
    const fullName = text("fullName");
    const email = text("email").toLowerCase();
    if (!fullName) return NextResponse.json({ error: "fullName_required" }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "email_invalid" }, { status: 400 });
    }
    if (email === advisor.email.toLowerCase()) {
      return NextResponse.json({ error: "email_is_the_advisor" }, { status: 400 });
    }

    const loginUrl = `${origin}/login`;

    // Asking twice for the same client returns the same family, so "send the
    // link again" never opens a duplicate.
    const existing = await prisma.familyMember.findFirst({
      where: { email },
      include: { family: { select: { id: true, advisorId: true, displayName: true } } },
    });
    if (existing) {
      if (existing.family.advisorId !== advisor.id) {
        return NextResponse.json({ error: "email_in_use" }, { status: 409 });
      }
      return NextResponse.json({
        created: false,
        familyId: existing.family.id,
        displayName: existing.family.displayName,
        loginUrl,
        adminUrl: `${origin}/admin/families/${existing.family.id}`,
        message: loginMessage(existing.fullName, existing.email, loginUrl),
      });
    }

    const family = await prisma.family.create({
      data: {
        advisorId: advisor.id,
        displayName: text("displayName") || fullName,
        status: "onboarding",
        onboardingToken: randomUUID(),
        budgetOnly: body.budgetOnly === true,
      },
    });
    await ensureDefaultCategories(family.id);

    const access = await addFamilyMemberRecord(family.id, {
      fullName,
      email,
      phone: text("phone") || null,
      role: "primary",
    });
    if ("error" in access) {
      // Nothing was entered for this family yet, so remove it rather than
      // leave a family nobody can log in to.
      await prisma.family.delete({ where: { id: family.id } });
      return NextResponse.json({ error: "access_failed", detail: access.error }, { status: 409 });
    }

    return NextResponse.json({
      created: true,
      familyId: family.id,
      displayName: family.displayName,
      loginUrl,
      adminUrl: `${origin}/admin/families/${family.id}`,
      message: loginMessage(fullName, email, loginUrl),
    });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
