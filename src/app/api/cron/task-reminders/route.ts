import { NextRequest, NextResponse } from "next/server";
import { sendDueTaskReminders } from "@/lib/reminders";

// Triggered daily by Vercel Cron (see vercel.json) once deployed.
// Vercel signs the request with CRON_SECRET as a Bearer token
// automatically when that env var is set on the project - this guards
// the endpoint from being triggered by anyone else in the meantime.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const baseUrl = new URL(request.url).origin;
  const result = await sendDueTaskReminders(baseUrl);

  return NextResponse.json(result);
}
