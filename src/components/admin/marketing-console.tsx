"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, Select, TextArea } from "@/components/ui/input"
import type { MarketingDraft, MarketingLead, MarketingSnapshot } from "@/lib/chameleon-marketing"

type MarketingConsoleProps = {
  initialSnapshot: MarketingSnapshot
}

type LeadFormState = {
  full_name: string
  platform: string
  handle: string
  source: string
  stage: string
  temperature: string
  notes: string
  next_follow_up_at: string
  status: string
}

type TaskFormState = {
  lead_key: string
  task_type: string
  channel: string
  objective: string
  campaign_profile: string
  required_output_format: string
  constraints: string
  banned_claims: string
  priority: string
}

const defaultLeadForm: LeadFormState = {
  full_name: "",
  platform: "instagram",
  handle: "",
  source: "warm inbound",
  stage: "new",
  temperature: "warm",
  notes: "",
  next_follow_up_at: "",
  status: "active",
}

const defaultTaskForm: TaskFormState = {
  lead_key: "",
  task_type: "draft_dm_reply",
  channel: "dm",
  objective: "",
  campaign_profile: "default",
  required_output_format: "2-3 variants plus short rationale",
  constraints: "",
  banned_claims: "",
  priority: "normal",
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set"
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function statusBadgeVariant(status: string): "default" | "success" | "warning" | "pink" {
  if (["approved", "sent"].includes(status)) return "success"
  if (["rejected", "failed"].includes(status)) return "warning"
  if (["needs_review", "drafted", "revision_requested", "ready_to_send"].includes(status)) return "pink"
  return "default"
}

function draftNeedsReview(draft: MarketingDraft) {
  return ["drafted", "needs_review", "revision_requested"].includes(draft.status)
}

export function MarketingConsole({ initialSnapshot }: MarketingConsoleProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [leadForm, setLeadForm] = useState<LeadFormState>(defaultLeadForm)
  const [taskForm, setTaskForm] = useState<TaskFormState>(defaultTaskForm)
  const [selectedLeadKey, setSelectedLeadKey] = useState<string>("")
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({})
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string>("")
  const [isPending, startTransition] = useTransition()

  const leads = snapshot.leads
  const drafts = snapshot.drafts
  const reviewDrafts = useMemo(() => drafts.filter(draftNeedsReview), [drafts])
  const approvedDrafts = useMemo(() => drafts.filter((draft) => ["approved", "ready_to_send"].includes(draft.status)), [drafts])

  useEffect(() => {
    if (selectedLeadKey && !snapshot.leads.some((lead) => lead.key === selectedLeadKey)) {
      setSelectedLeadKey("")
    }
  }, [selectedLeadKey, snapshot.leads])

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshSnapshot()
    }, 15000)

    return () => clearInterval(timer)
  }, [])

  async function refreshSnapshot() {
    const response = await fetch("/api/admin/marketing", { cache: "no-store" })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || "Failed to refresh marketing snapshot")
    }
    setSnapshot(data)
  }

  async function submitAction(body: Record<string, unknown>, successMessage: string) {
    setMessage("")
    const response = await fetch("/api/admin/marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || "Marketing action failed")
    }
    await refreshSnapshot()
    setMessage(successMessage)
    return data
  }

  function hydrateLeadForm(lead: MarketingLead) {
    setSelectedLeadKey(lead.key)
    setLeadForm({
      full_name: lead.full_name,
      platform: lead.platform,
      handle: lead.handle,
      source: lead.source,
      stage: lead.stage,
      temperature: lead.temperature,
      notes: lead.notes,
      next_follow_up_at: lead.next_follow_up_at ? lead.next_follow_up_at.slice(0, 16) : "",
      status: lead.status,
    })
    setTaskForm((current) => ({ ...current, lead_key: lead.key }))
  }

  function resetLeadForm() {
    setSelectedLeadKey("")
    setLeadForm(defaultLeadForm)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketing Console</h1>
          <p className="text-sm text-gf-muted mt-1">
            Internal-only Chameleon marketing operations with approval gating, audit visibility, and local runner status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={snapshot.runner.status === "running" ? "success" : "warning"}>
            Runner {snapshot.runner.status}
          </Badge>
          <Button variant="secondary" onClick={() => startTransition(() => { void refreshSnapshot() })} disabled={isPending}>
            Refresh
          </Button>
        </div>
      </div>

      {message ? (
        <Card className="p-4">
          <p className="text-sm text-green-400">{message}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card glow><p className="text-2xl font-bold">{snapshot.overview.new_leads}</p><p className="text-sm text-gf-muted mt-1">New leads</p></Card>
        <Card><p className="text-2xl font-bold">{snapshot.overview.drafts_awaiting_review}</p><p className="text-sm text-gf-muted mt-1">Awaiting review</p></Card>
        <Card><p className="text-2xl font-bold">{snapshot.overview.approved_ready_to_send}</p><p className="text-sm text-gf-muted mt-1">Approved / ready</p></Card>
        <Card><p className="text-2xl font-bold">{snapshot.overview.follow_ups_due}</p><p className="text-sm text-gf-muted mt-1">Follow-ups due</p></Card>
        <Card><p className="text-2xl font-bold">{snapshot.overview.pending_tasks}</p><p className="text-sm text-gf-muted mt-1">Pending tasks</p></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Leads</CardTitle>
              <p className="text-sm text-gf-muted mt-1">Manage warm leads, stage them, and queue the next action.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={resetLeadForm}>New lead</Button>
          </CardHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Lead name" value={leadForm.full_name} onChange={(e) => setLeadForm((c) => ({ ...c, full_name: e.target.value }))} />
            <Input label="Handle" value={leadForm.handle} onChange={(e) => setLeadForm((c) => ({ ...c, handle: e.target.value }))} />
            <Select label="Platform" value={leadForm.platform} onChange={(e) => setLeadForm((c) => ({ ...c, platform: e.target.value }))} options={[
              { value: "instagram", label: "Instagram" },
              { value: "x", label: "X" },
              { value: "linkedin", label: "LinkedIn" },
              { value: "email", label: "Email" },
              { value: "other", label: "Other" },
            ]} />
            <Input label="Source" value={leadForm.source} onChange={(e) => setLeadForm((c) => ({ ...c, source: e.target.value }))} />
            <Select label="Stage" value={leadForm.stage} onChange={(e) => setLeadForm((c) => ({ ...c, stage: e.target.value }))} options={[
              { value: "new", label: "New" },
              { value: "warm", label: "Warm" },
              { value: "qualified", label: "Qualified" },
              { value: "conversation", label: "Conversation" },
              { value: "booked", label: "Booked" },
            ]} />
            <Select label="Temperature" value={leadForm.temperature} onChange={(e) => setLeadForm((c) => ({ ...c, temperature: e.target.value }))} options={[
              { value: "cold", label: "Cold" },
              { value: "warm", label: "Warm" },
              { value: "hot", label: "Hot" },
            ]} />
            <Input label="Next follow-up" type="datetime-local" value={leadForm.next_follow_up_at} onChange={(e) => setLeadForm((c) => ({ ...c, next_follow_up_at: e.target.value }))} />
            <Select label="Status" value={leadForm.status} onChange={(e) => setLeadForm((c) => ({ ...c, status: e.target.value }))} options={[
              { value: "active", label: "Active" },
              { value: "paused", label: "Paused" },
              { value: "archived", label: "Archived" },
            ]} />
          </div>
          <div className="mt-3">
            <TextArea label="Notes" value={leadForm.notes} onChange={(e) => setLeadForm((c) => ({ ...c, notes: e.target.value }))} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              onClick={() =>
                startTransition(() => {
                  void submitAction(
                    selectedLeadKey
                      ? {
                          action: "update_lead",
                          lead_key: selectedLeadKey,
                          patch: {
                            ...leadForm,
                            next_follow_up_at: leadForm.next_follow_up_at || null,
                          },
                        }
                      : {
                          action: "create_lead",
                          payload: {
                            ...leadForm,
                            next_follow_up_at: leadForm.next_follow_up_at || null,
                          },
                        },
                    selectedLeadKey ? "Lead updated." : "Lead created."
                  ).then(() => {
                    if (!selectedLeadKey) {
                      setLeadForm(defaultLeadForm)
                    }
                  })
                })
              }
              disabled={isPending || !leadForm.full_name.trim()}
            >
              {selectedLeadKey ? "Update lead" : "Create lead"}
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            {leads.length === 0 ? (
              <p className="text-sm text-gf-muted">No leads yet. Add your first warm lead to start the queue.</p>
            ) : (
              leads.map((lead) => (
                <button
                  key={lead.key}
                  type="button"
                  onClick={() => hydrateLeadForm(lead)}
                  className="w-full rounded-xl border border-gf-border bg-gf-black/20 p-4 text-left transition-colors hover:border-gf-pink/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{lead.full_name}</p>
                      <p className="text-sm text-gf-muted mt-1">{lead.platform} • {lead.handle || "No handle"} • {lead.source}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={statusBadgeVariant(lead.stage)}>{lead.stage}</Badge>
                      <Badge variant={statusBadgeVariant(lead.temperature)}>{lead.temperature}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gf-muted mt-3">{lead.notes || "No notes yet."}</p>
                  <p className="text-xs text-gf-muted mt-3">Follow-up: {formatDate(lead.next_follow_up_at)}</p>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Queue Task</CardTitle>
            <p className="text-sm text-gf-muted mt-1">Create the next drafting job for the local Codex runner.</p>
          </CardHeader>
          <div className="grid gap-3">
            <Select label="Lead" value={taskForm.lead_key} onChange={(e) => setTaskForm((c) => ({ ...c, lead_key: e.target.value }))} options={leads.map((lead) => ({ value: lead.key, label: `${lead.full_name} (${lead.platform})` }))} />
            <Select label="Task type" value={taskForm.task_type} onChange={(e) => setTaskForm((c) => ({ ...c, task_type: e.target.value }))} options={[
              { value: "draft_dm_reply", label: "Draft DM reply" },
              { value: "draft_follow_up", label: "Draft follow-up" },
              { value: "draft_social_post", label: "Draft social post" },
              { value: "lead_summary", label: "Lead summary" },
            ]} />
            <Select label="Channel" value={taskForm.channel} onChange={(e) => setTaskForm((c) => ({ ...c, channel: e.target.value }))} options={[
              { value: "dm", label: "DM" },
              { value: "email", label: "Email" },
              { value: "social", label: "Social" },
            ]} />
            <Input label="Objective" value={taskForm.objective} onChange={(e) => setTaskForm((c) => ({ ...c, objective: e.target.value }))} />
            <Input label="Campaign profile" value={taskForm.campaign_profile} onChange={(e) => setTaskForm((c) => ({ ...c, campaign_profile: e.target.value }))} />
            <Input label="Output format" value={taskForm.required_output_format} onChange={(e) => setTaskForm((c) => ({ ...c, required_output_format: e.target.value }))} />
            <Select label="Priority" value={taskForm.priority} onChange={(e) => setTaskForm((c) => ({ ...c, priority: e.target.value }))} options={[
              { value: "low", label: "Low" },
              { value: "normal", label: "Normal" },
              { value: "high", label: "High" },
            ]} />
            <TextArea label="Constraints" value={taskForm.constraints} onChange={(e) => setTaskForm((c) => ({ ...c, constraints: e.target.value }))} />
            <TextArea label="Banned claims" value={taskForm.banned_claims} onChange={(e) => setTaskForm((c) => ({ ...c, banned_claims: e.target.value }))} />
          </div>
          <div className="mt-4">
            <Button
              onClick={() =>
                startTransition(() => {
                  void submitAction({
                    action: "create_task",
                    payload: {
                      ...taskForm,
                      constraints: taskForm.constraints.split("\n").map((item) => item.trim()).filter(Boolean),
                      banned_claims: taskForm.banned_claims.split("\n").map((item) => item.trim()).filter(Boolean),
                    },
                  }, "Task queued for the local runner.")
                })
              }
              disabled={isPending || !taskForm.lead_key || !taskForm.objective.trim()}
            >
              Queue task
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-white">Pending task queue</h3>
            {snapshot.tasks.filter((task) => ["queued", "claimed", "revision_requested"].includes(task.status)).length === 0 ? (
              <p className="text-sm text-gf-muted">No queued tasks right now.</p>
            ) : snapshot.tasks
                .filter((task) => ["queued", "claimed", "revision_requested"].includes(task.status))
                .map((task) => (
                  <div key={task.key} className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{task.task_type}</p>
                        <p className="text-sm text-gf-muted mt-1">{task.objective}</p>
                      </div>
                      <Badge variant={statusBadgeVariant(task.status)}>{task.status}</Badge>
                    </div>
                    <p className="text-xs text-gf-muted mt-3">Lead: {task.lead_key || "Standalone"} • Channel: {task.channel}</p>
                  </div>
                ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Draft Queue</CardTitle>
            <p className="text-sm text-gf-muted mt-1">Generated content, variants, and current approval state.</p>
          </CardHeader>
          <div className="space-y-4">
            {drafts.length === 0 ? (
              <p className="text-sm text-gf-muted">No drafts yet. They will appear here when the runner writes them back.</p>
            ) : drafts.map((draft) => (
              <div key={draft.key} className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{draft.variant_label} • {draft.draft_type}</p>
                    <p className="text-sm text-gf-muted mt-1">{draft.channel} • {draft.campaign_profile} • {draft.objective || "No objective set"}</p>
                  </div>
                  <Badge variant={statusBadgeVariant(draft.status)}>{draft.status}</Badge>
                </div>
                <p className="whitespace-pre-wrap text-sm text-white/90 mt-4">{draft.content || "No content yet."}</p>
                <p className="text-xs text-gf-muted mt-3">Created: {formatDate(draft.created_at)} • Lead: {draft.lead_key || "N/A"}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approvals</CardTitle>
            <p className="text-sm text-gf-muted mt-1">Review drafts, request revisions, and manually close the send loop.</p>
          </CardHeader>
          <div className="space-y-4">
            {reviewDrafts.length === 0 && approvedDrafts.length === 0 ? (
              <p className="text-sm text-gf-muted">Nothing needs a decision right now.</p>
            ) : null}

            {reviewDrafts.map((draft) => (
              <div key={draft.key} className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{draft.variant_label} • {draft.draft_type}</p>
                    <p className="text-xs text-gf-muted mt-1">{draft.key}</p>
                  </div>
                  <Badge variant={statusBadgeVariant(draft.status)}>{draft.status}</Badge>
                </div>
                <TextArea
                  label="Editable draft"
                  className="mt-4"
                  value={draftEdits[draft.key] ?? draft.content}
                  onChange={(e) => setDraftEdits((current) => ({ ...current, [draft.key]: e.target.value }))}
                />
                <TextArea
                  label="Reviewer note"
                  className="mt-3"
                  value={draftNotes[draft.key] ?? ""}
                  onChange={(e) => setDraftNotes((current) => ({ ...current, [draft.key]: e.target.value }))}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => startTransition(() => {
                    void submitAction({ action: "draft_action", payload: { draft_key: draft.key, action: "approve", reviewer_note: draftNotes[draft.key] ?? "" } }, "Draft approved.")
                  })}>Approve</Button>
                  <Button size="sm" variant="secondary" onClick={() => startTransition(() => {
                    void submitAction({ action: "draft_action", payload: { draft_key: draft.key, action: "edit_and_approve", content: draftEdits[draft.key] ?? draft.content, reviewer_note: draftNotes[draft.key] ?? "" } }, "Draft edited and approved.")
                  })}>Edit + approve</Button>
                  <Button size="sm" variant="secondary" onClick={() => startTransition(() => {
                    void submitAction({ action: "draft_action", payload: { draft_key: draft.key, action: "request_revision", reviewer_note: draftNotes[draft.key] ?? "" } }, "Revision requested.")
                  })}>Request revision</Button>
                  <Button size="sm" variant="ghost" onClick={() => startTransition(() => {
                    void submitAction({ action: "draft_action", payload: { draft_key: draft.key, action: "reject", reviewer_note: draftNotes[draft.key] ?? "" } }, "Draft rejected.")
                  })}>Reject</Button>
                </div>
              </div>
            ))}

            {approvedDrafts.map((draft) => (
              <div key={draft.key} className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{draft.variant_label} • {draft.draft_type}</p>
                    <p className="text-sm text-gf-muted mt-1">Approved: {formatDate(draft.approved_at)}</p>
                  </div>
                  <Badge variant={statusBadgeVariant(draft.status)}>{draft.status}</Badge>
                </div>
                <p className="whitespace-pre-wrap text-sm text-white/90 mt-4">{draft.content}</p>
                <TextArea
                  label="Outcome note"
                  className="mt-3"
                  value={draftNotes[draft.key] ?? draft.outcome_note ?? ""}
                  onChange={(e) => setDraftNotes((current) => ({ ...current, [draft.key]: e.target.value }))}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {draft.status === "approved" ? (
                    <Button size="sm" variant="secondary" onClick={() => startTransition(() => {
                      void submitAction({ action: "draft_action", payload: { draft_key: draft.key, action: "mark_ready" } }, "Draft marked ready to send.")
                    })}>Mark ready</Button>
                  ) : null}
                  <Button size="sm" onClick={() => startTransition(() => {
                    void submitAction({ action: "draft_action", payload: { draft_key: draft.key, action: "mark_sent", outcome_note: draftNotes[draft.key] ?? "" } }, "Draft marked as sent.")
                  })}>Mark sent</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <p className="text-sm text-gf-muted mt-1">Live audit trail from the Chameleon memory subsystem.</p>
          </CardHeader>
          <div className="space-y-3">
            {snapshot.activity.audit.length === 0 ? (
              <p className="text-sm text-gf-muted">No activity recorded yet.</p>
            ) : snapshot.activity.audit.map((event) => (
              <div key={event.id} className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{event.summary || event.op}</p>
                    <p className="text-xs text-gf-muted mt-1">{event.op} • {event.sector || "system"} • {event.agent || "unknown"}</p>
                  </div>
                  <p className="text-xs text-gf-muted">{formatDate(event.ts)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Runs</CardTitle>
              <p className="text-sm text-gf-muted mt-1">Operational view of the local marketing runner.</p>
            </CardHeader>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-gf-muted">Status</span><Badge variant={snapshot.runner.status === "running" ? "success" : "warning"}>{snapshot.runner.status}</Badge></div>
              <div className="flex items-center justify-between"><span className="text-gf-muted">Current task</span><span>{snapshot.runner.current_task_key || "None"}</span></div>
              <div className="flex items-center justify-between"><span className="text-gf-muted">Last heartbeat</span><span>{formatDate(snapshot.runner.heartbeat_at)}</span></div>
              <div className="flex items-center justify-between"><span className="text-gf-muted">Pending queue</span><span>{snapshot.runner.pending_queue_count}</span></div>
              <div>
                <p className="text-gf-muted">Last error</p>
                <p className="mt-1 text-white">{snapshot.runner.last_error || "None"}</p>
              </div>
              <div>
                <p className="text-gf-muted">Recent actions</p>
                {snapshot.runner.recent_actions.length === 0 ? (
                  <p className="mt-1 text-white">No runner actions recorded yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {snapshot.runner.recent_actions.map((action, index) => (
                      <li key={`${action}-${index}`} className="rounded-lg border border-gf-border bg-gf-black/20 px-3 py-2 text-white">{action}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Messages</CardTitle>
              <p className="text-sm text-gf-muted mt-1">Broadcasts and alerts from the Chameleon message board.</p>
            </CardHeader>
            <div className="space-y-3">
              {snapshot.messages.messages.length === 0 ? (
                <p className="text-sm text-gf-muted">No messages yet.</p>
              ) : snapshot.messages.messages.map((message) => (
                <div key={message.key} className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{message.data.tag}</p>
                      <p className="text-xs text-gf-muted mt-1">{message.data.sender} • {message.data.channel}</p>
                    </div>
                    <p className="text-xs text-gf-muted">{formatDate(message.created_at)}</p>
                  </div>
                  <p className="mt-3 text-sm text-white/90 whitespace-pre-wrap">{message.data.content}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
