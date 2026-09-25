export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

// In-memory store: Map<tripId, Map<supervisorId, { supervisorName, lastSeen }>>
const watcherStore = new Map();

const TTL_MS = 30_000;

function getTrip(tripId) {
  if (!watcherStore.has(tripId)) watcherStore.set(tripId, new Map());
  return watcherStore.get(tripId);
}

function activeWatchers(tripMap) {
  const now = Date.now();
  const result = [];
  for (const [supervisorId, info] of tripMap.entries()) {
    if (now - info.lastSeen.getTime() <= TTL_MS) {
      result.push({ supervisorId, supervisorName: info.supervisorName });
    }
  }
  return result;
}

// GET /api/trips/[id]/watchers — list active watchers (within last 30s)
export async function GET(request, { params }) {
  const { id } = await params;
  const tripMap = getTrip(id);
  const watchers = activeWatchers(tripMap);
  return NextResponse.json({ count: watchers.length, watchers });
}

// POST /api/trips/[id]/watchers — register / refresh a watcher
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { supervisorId, supervisorName } = await request.json();
    if (!supervisorId) {
      return NextResponse.json({ error: 'supervisorId required' }, { status: 400 });
    }
    const tripMap = getTrip(id);
    tripMap.set(supervisorId, { supervisorName: supervisorName || supervisorId, lastSeen: new Date() });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/trips/[id]/watchers — deregister a watcher
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { supervisorId } = await request.json();
    if (!supervisorId) {
      return NextResponse.json({ error: 'supervisorId required' }, { status: 400 });
    }
    const tripMap = getTrip(id);
    tripMap.delete(supervisorId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
