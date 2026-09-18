import { NextResponse } from "next/server";
import { buildSchedule3 } from "@/lib/finance";

// GET /api/schedule3?companyId=xxx&fromDate=2026-04-01&toDate=2027-03-31
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const fromDateStr = searchParams.get("fromDate");
  const toDateStr = searchParams.get("toDate");

  if (!companyId || !fromDateStr || !toDateStr) {
    return NextResponse.json(
      { error: "companyId, fromDate and toDate are required query params" },
      { status: 400 }
    );
  }

  const fromDate = new Date(fromDateStr);
  const toDate = new Date(toDateStr);

  if (isNaN(fromDate) || isNaN(toDate)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  try {
    const schedule3 = await buildSchedule3(companyId, fromDate, toDate);
    return NextResponse.json(schedule3);
  } catch (err) {
    console.error("Schedule III error:", err);
    return NextResponse.json({ error: "Failed to build Schedule III" }, { status: 500 });
  }
}
