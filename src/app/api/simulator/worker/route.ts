import { NextResponse } from "next/server";
import { processDueSimulatorJobs } from "@/lib/simulator/worker";

export const runtime = "nodejs";

export async function POST() {
	try {
		const processed = await processDueSimulatorJobs(5);
		return NextResponse.json({ processed });
	} catch (e) {
		return NextResponse.json({ error: (e as Error).message }, { status: 500 });
	}
}

export async function GET() {
	return POST();
}