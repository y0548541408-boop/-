import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { VIEW_AS_COOKIE } from "@/lib/currentMember";

// Leaves the "as the client" view and goes back to the advisor's area.
export async function GET(request: NextRequest) {
  (await cookies()).delete(VIEW_AS_COOKIE);
  return NextResponse.redirect(new URL("/admin", request.url));
}
