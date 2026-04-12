import { NextRequest, NextResponse } from "next/server"
import { withChameleonMemory } from "@/app/api/chameleon-memory/_utils"
import {
  assertSector,
  audit,
  deleteEntry,
  readEntry,
  updateEntry,
  writeEntry,
} from "@/lib/chameleon-memory/service"

type Params = { params: Promise<{ sector: string; key: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { sector, key } = await params

  return withChameleonMemory(request, async ({ supabase, agent }) => {
    assertSector(sector)
    const result = await readEntry(supabase, sector, key)
    if (!result) {
      return NextResponse.json({ error: `No entry '${key}' in sector '${sector}'` }, { status: 404 })
    }

    await audit(supabase, {
      op: "read",
      sector,
      key,
      agent,
      summary: `Read ${sector}/${key}`,
    })

    return NextResponse.json(result)
  })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { sector, key } = await params

  return withChameleonMemory(request, async ({ supabase, agent }) => {
    assertSector(sector)
    const body = await request.json()
    const result = await writeEntry(supabase, sector, key, body.data ?? {})
    await audit(supabase, {
      op: "write",
      sector,
      key,
      agent: (body.data?.agent as string | undefined) ?? (body.data?.sender as string | undefined) ?? agent,
      summary: `Wrote ${sector}/${key}`,
    })
    return NextResponse.json(result)
  })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { sector, key } = await params

  return withChameleonMemory(request, async ({ supabase, agent }) => {
    assertSector(sector)
    const body = await request.json()
    const result = await updateEntry(supabase, sector, key, body.patch ?? {})
    if (!result) {
      return NextResponse.json({ error: `No entry '${key}' in sector '${sector}'` }, { status: 404 })
    }

    await audit(supabase, {
      op: "update",
      sector,
      key,
      agent,
      summary: `Updated ${sector}/${key}`,
      meta: { patched_fields: Object.keys(body.patch ?? {}) },
    })

    return NextResponse.json(result)
  })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { sector, key } = await params

  return withChameleonMemory(request, async ({ supabase, agent }) => {
    assertSector(sector)
    const deleted = await deleteEntry(supabase, sector, key)
    if (!deleted) {
      return NextResponse.json({ error: `No entry '${key}' in sector '${sector}'` }, { status: 404 })
    }

    await audit(supabase, {
      op: "delete",
      sector,
      key,
      agent,
      summary: `Deleted ${sector}/${key}`,
    })

    return NextResponse.json({ ok: true, sector, key, deleted: true })
  })
}
