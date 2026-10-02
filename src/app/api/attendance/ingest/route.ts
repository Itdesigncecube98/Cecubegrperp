import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingPunch = {
  deviceLogId: number;
  deviceId: string | null;
  userId?: string | null;
  employeeCode?: string | null;
  employeeName?: string | null;
  designation?: string | null;
  direction?: string | null;
  punchTime: string;
  location?: string | null;
};

function keyMatches(provided: string | null): boolean {
  const expected = process.env.ATTENDANCE_API_KEY;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!keyMatches(request.headers.get("x-api-key"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { source?: string; punches?: IncomingPunch[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const punches = body?.punches;
  if (!Array.isArray(punches)) {
    return NextResponse.json({ error: "punches must be an array" }, { status: 400 });
  }
  if (punches.length > 2000) {
    return NextResponse.json({ error: "too many punches in one request" }, { status: 413 });
  }

  const source = typeof body.source === "string" && body.source.trim()
    ? body.source.trim().slice(0, 100)
    : "etimetracklite";
  const rows: Array<{
    deviceLogId: number;
    deviceId: string;
    userId: string | null;
    employeeCode: string | null;
    employeeName: string | null;
    designation: string | null;
    direction: string | null;
    punchTime: Date;
    location: string | null;
    source: string;
  }> = [];
  let invalid = 0;

  for (const punch of punches) {
    const punchTime = new Date(punch?.punchTime);
    if (
      !punch ||
      !Number.isSafeInteger(punch.deviceLogId) ||
      punch.deviceLogId < 0 ||
      typeof punch.deviceId !== "string" ||
      !punch.deviceId.trim() ||
      Number.isNaN(punchTime.getTime())
    ) {
      invalid++;
      continue;
    }

    rows.push({
      deviceLogId: punch.deviceLogId,
      deviceId: punch.deviceId.trim().slice(0, 100),
      userId: typeof punch.userId === "string" ? punch.userId.slice(0, 100) : null,
      employeeCode: typeof punch.employeeCode === "string" ? punch.employeeCode.slice(0, 100) : null,
      employeeName: typeof punch.employeeName === "string" ? punch.employeeName.slice(0, 200) : null,
      designation: typeof punch.designation === "string" ? punch.designation.slice(0, 200) : null,
      direction: typeof punch.direction === "string" ? punch.direction.slice(0, 50) : null,
      punchTime,
      location: typeof punch.location === "string" ? punch.location.slice(0, 200) : null,
      source,
    });
  }

  const result = await prisma.attendancePunch.createMany({ data: rows, skipDuplicates: true });

  return NextResponse.json({
    received: punches.length,
    inserted: result.count,
    duplicatesOrSkipped: punches.length - result.count,
    invalid,
  });
}
