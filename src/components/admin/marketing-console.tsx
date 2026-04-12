"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, Select, TextArea } from "@/components/ui/input"
import type { MarketingDraft, MarketingLead, MarketingSettings, MarketingSnapshot } from "@/lib/chameleon-marketing"

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

type RunnerSettingsFormState = {
  budget_mode: "on" | "off"
  autoscan_enabled: "on" | "off"
  discovery_model: string
  drafting_model: string
  revision_model: string
  max_draft_variants: string
  max_output_tokens: string
  reddit_subreddits: string
  reddit_search_terms: string
  openai_api_key: string
}

const defaultLeadForm: LeadFormState = {
  full_name: "",
  platform: "reddit",
  handle: "",
  source: "reddit discovery",
  stage: "new",
  temperature: "warm",
  notes: "",
  next_follow_up_at: "",
  status: "active",
}

const defaultTaskForm: TaskFormState = {
  lead_key: "",
  task_type: "scan_reddit_leads",
  channel: "reddit_search",
  objective: "Scan Reddit for coaches using Google Sheets or spreadsheets to run client operations.",
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

function boolLabel(value: boolean | null | undefined) {
  if (value === true) return "Yes"
  if (value === false) return "No"
  return "Unknown"
}

function trimPreview(value: string | null | undefined, max = 180) {
  const text = (value ?? "").trim()
  if (!text) return ""
  return text.length > max ? `${text.slice(0, max).trim()}...` : text
}

function buildRunnerSettingsForm(settings: MarketingSettings): RunnerSettingsFormState {
  return {
    budget_mode: settings.budget_mode ? "on" : "off",
    autoscan_enabled: settings.autoscan_enabled ? "on" : "off",
    discovery_model: settings.model_preferences.discovery || "gpt-5-nano",
    drafting_model: settings.model_preferences.drafting || "gpt-5-mini",
    revision_model: settings.model_preferences.revision || "gpt-5-mini",
    max_draft_variants: String(settings.output_limits.max_draft_variants ?? 2),
    max_output_tokens: String(settings.output_limits.max_output_tokens ?? 500),
    reddit_subreddits: settings.reddit.subreddits.join(", "),
    reddit_search_terms: settings.reddit.search_terms.join(", "),
    openai_api_key: "",
  }
}

export function MarketingConsole({ initialSnapshot }: MarketingConsoleProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [activeTab, setActiveTab] = useState<"operations" | "mcp">("operations")
  const [leadForm, setLeadForm] = useState<LeadFormState>(defaultLeadForm)
  const [taskForm, setTaskForm] = useState<TaskFormState>(defaultTaskForm)
  const [selectedLeadKey, setSelectedLeadKey] = useState<string>("")
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({})
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string>("")
  const [runnerSettingsForm, setRunnerSettingsForm] = useState<RunnerSettingsFormState>(() => buildRunnerSettingsForm(initialSnapshot.settings))
  const [isPending, startTransition] = useTransition()

  const leads = snapshot.leads
  const tasks = snapshot.tasks
  const drafts = snapshot.drafts
  const reviewDrafts = useMemo(() => drafts.filter(draftNeedsReview), [drafts])
  const approvedDrafts = useMemo(() => drafts.filter((draft) => ["approved", "ready_to_send"].includes(draft.status)), [drafts])
  const selectedTaskNeedsLead = taskForm.task_type !== "scan_reddit_leads"
  const queuedTasks = useMemo(() => tasks.filter((task) => ["queued", "claimed", "revision_requested"].includes(task.status)), [tasks])
  const sentDrafts = useMemo(() => drafts.filter((draft) => draft.status === "sent"), [drafts])

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
    setRunnerSettingsForm((current) => ({
      ...buildRunnerSettingsForm(data.settings),
      openai_api_key: current.openai_api_key,
    }))
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

  function runRunnerControl(action: "trigger_scan" | "process_queue" | "pause_autoscan" | "resume_autoscan", successMessage: string) {
    startTransition(() => {
      void submitAction(
        {
          action: "runner_control",
          payload: { action },
        },
        successMessage
      )
    })
  }

  function saveRunnerSettings() {
    startTransition(() => {
      void saveMarketingSettings()
    })
  }

  async function saveMarketingSettings(removeKey = false) {
    setMessage("")
    const response = await fetch("/api/admin/marketing/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        remove_openai_api_key: removeKey,
        openai_api_key: removeKey ? "" : runnerSettingsForm.openai_api_key,
        budget_mode: runnerSettingsForm.budget_mode === "on",
        autoscan_enabled: runnerSettingsForm.autoscan_enabled === "on",
        discovery_model: runnerSettingsForm.discovery_model,
        drafting_model: runnerSettingsForm.drafting_model,
        revision_model: runnerSettingsForm.revision_model,
        max_draft_variants: Number(runnerSettingsForm.max_draft_variants || 2),
        max_output_tokens: Number(runnerSettingsForm.max_output_tokens || 500),
        reddit_subreddits: runnerSettingsForm.reddit_subreddits.split(",").map((item) => item.trim()).filter(Boolean),
        reddit_search_terms: runnerSettingsForm.reddit_search_terms.split(",").map((item) => item.trim()).filter(Boolean),
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || "Failed to save marketing settings")
    }
    await refreshSnapshot()
    setRunnerSettingsForm((current) => ({ ...current, openai_api_key: "" }))
    setMessage(removeKey ? "Marketing AI key removed." : "Marketing AI settings updated.")
    return data
  }

  async function copyDraft(text: string) {
    await navigator.clipboard.writeText(text)
    setMessage("Draft copied to clipboard.")
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
          <Badge variant={snapshot.settings.autoscan_enabled === false ? "warning" : "default"}>
            Autoscan {snapshot.settings.autoscan_enabled === false ? "paused" : "live"}
          </Badge>
          <Badge variant={snapshot.settings.has_openai_api_key ? "success" : "warning"}>
            AI key {snapshot.settings.has_openai_api_key ? "connected" : "missing"}
          </Badge>
          <Button variant="secondary" onClick={() => startTransition(() => { void refreshSnapshot() })} disabled={isPending}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant={activeTab === "operations" ? "primary" : "secondary"} onClick={() => setActiveTab("operations")}>
          Operations
        </Button>
        <Button variant={activeTab === "mcp" ? "primary" : "secondary"} onClick={() => setActiveTab("mcp")}>
          MCP Monitor
        </Button>
      </div>

      {message ? (
        <Card className="p-4">
          <p className="text-sm text-green-400">{message}</p>
        </Card>
      ) : null}

      {snapshot.runner.status === "offline" && queuedTasks.length > 0 ? (
        <Card className="border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-200">
            Work is queued, but the local runner is offline. Start it on your machine with <code>npm run runner:marketing</code> to process the queue.
          </p>
        </Card>
      ) : null}

      {activeTab === "operations" ? (
        <>
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
              { value: "reddit", label: "Reddit" },
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
                  {typeof lead.fit_score === "number" ? (
                    <p className="text-xs text-gf-muted mt-3">Fit score: {lead.fit_score}/10</p>
                  ) : null}
                  {lead.source_title ? (
                    <p className="text-sm text-white mt-3">{lead.source_title}</p>
                  ) : null}
                  <p className="text-sm text-gf-muted mt-3">{trimPreview(lead.ai_summary || lead.notes) || "No notes yet."}</p>
                  {lead.discovery_reason ? (
                    <p className="text-xs text-gf-muted mt-3">Why matched: {lead.discovery_reason}</p>
                  ) : null}
                  <p className="text-xs text-gf-muted mt-3">Follow-up: {formatDate(lead.next_follow_up_at)}</p>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Discovery Trace</CardTitle>
            <p className="text-sm text-gf-muted mt-1">Source evidence for the currently selected lead.</p>
          </CardHeader>
          {selectedLeadKey ? (() => {
            const selectedLead = leads.find((lead) => lead.key === selectedLeadKey)
            if (!selectedLead) {
              return <p className="text-sm text-gf-muted">Selected lead not found.</p>
            }

            return (
              <div className="space-y-4">
                <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <p className="text-sm text-gf-muted">Lead</p>
                  <p className="mt-1 text-white">{selectedLead.full_name} {selectedLead.handle ? `(@${selectedLead.handle})` : ""}</p>
                  <p className="mt-1 text-xs text-gf-muted">{selectedLead.source}</p>
                </div>
                <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <p className="text-sm text-gf-muted">Source post</p>
                  <p className="mt-1 text-white">{selectedLead.source_title || "No source title recorded."}</p>
                  {selectedLead.source_permalink ? (
                    <a
                      href={selectedLead.source_permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm text-gf-pink underline"
                    >
                      Open Reddit post
                    </a>
                  ) : null}
                </div>
                <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <p className="text-sm text-gf-muted">Why the runner matched this lead</p>
                  <p className="mt-1 text-white">{selectedLead.discovery_reason || "No discovery reason recorded yet."}</p>
                  {typeof selectedLead.fit_score === "number" ? (
                    <p className="mt-2 text-xs text-gf-muted">Fit score: {selectedLead.fit_score}/10</p>
                  ) : null}
                </div>
                <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <p className="text-sm text-gf-muted">Extracted context</p>
                  <p className="mt-1 whitespace-pre-wrap text-white">{selectedLead.source_excerpt || "No excerpt recorded."}</p>
                </div>
                <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <p className="text-sm text-gf-muted">AI summary</p>
                  <p className="mt-1 whitespace-pre-wrap text-white">{selectedLead.ai_summary || "No AI summary recorded yet."}</p>
                  <p className="mt-2 text-xs text-gf-muted">Discovered: {formatDate(selectedLead.discovered_at || selectedLead.created_at)}</p>
                </div>
              </div>
            )
          })() : (
            <p className="text-sm text-gf-muted">Select a lead to inspect the Reddit discovery evidence.</p>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Queue Task</CardTitle>
            <p className="text-sm text-gf-muted mt-1">Queue discovery or drafting work here. The website stores the job; your local runner actually executes it.</p>
          </CardHeader>
          <div className="grid gap-3">
            {selectedTaskNeedsLead ? (
              <Select label="Lead" value={taskForm.lead_key} onChange={(e) => setTaskForm((c) => ({ ...c, lead_key: e.target.value }))} options={leads.map((lead) => ({ value: lead.key, label: `${lead.full_name} (${lead.platform})` }))} />
            ) : (
              <Card className="border border-gf-border bg-gf-black/20 p-3">
                <p className="text-sm text-white">This is a standalone discovery task. It does not need a lead selected first.</p>
              </Card>
            )}
            <Select label="Task type" value={taskForm.task_type} onChange={(e) => setTaskForm((c) => ({ ...c, task_type: e.target.value }))} options={[
              { value: "scan_reddit_leads", label: "Scan Reddit leads" },
              { value: "draft_reddit_outreach", label: "Draft Reddit outreach" },
              { value: "draft_dm_reply", label: "Draft DM reply" },
              { value: "draft_follow_up", label: "Draft follow-up" },
              { value: "draft_social_post", label: "Draft social post" },
              { value: "lead_summary", label: "Lead summary" },
            ]} />
            <Select label="Channel" value={taskForm.channel} onChange={(e) => setTaskForm((c) => ({ ...c, channel: e.target.value }))} options={[
              { value: "reddit_search", label: "Reddit search" },
              { value: "reddit_dm", label: "Reddit DM" },
              { value: "reddit_comment", label: "Reddit comment" },
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
                      lead_key: selectedTaskNeedsLead ? taskForm.lead_key : null,
                      constraints: taskForm.constraints.split("\n").map((item) => item.trim()).filter(Boolean),
                      banned_claims: taskForm.banned_claims.split("\n").map((item) => item.trim()).filter(Boolean),
                    },
                  }, "Task queued for the local runner.")
                })
              }
              disabled={isPending || (selectedTaskNeedsLead && !taskForm.lead_key) || !taskForm.objective.trim()}
            >
              Queue task
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                startTransition(() => {
                  void submitAction({
                    action: "create_task",
                    payload: {
                      lead_key: null,
                      task_type: "scan_reddit_leads",
                      channel: "reddit_search",
                      objective: "Scan Reddit for fitness and coaching leads using Google Sheets or spreadsheets to manage clients.",
                      campaign_profile: "reddit_google_sheets",
                      required_output_format: "Create qualified leads, conversation records, and outreach tasks for the best matches.",
                      constraints: [
                        "Focus on coaches, personal trainers, online coaches, and fitness operators.",
                        "Prioritize leads mentioning Google Sheets, spreadsheets, onboarding, check-ins, client tracking, or admin workflows.",
                        "Do not create duplicates if the Reddit handle already exists as a lead.",
                      ],
                      banned_claims: [
                        "Do not promise revenue outcomes.",
                        "Do not promise medical or health outcomes.",
                      ],
                    },
                  }, "Reddit discovery task queued.")
                })
              }
              disabled={isPending}
            >
              Queue Reddit scan
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-white">Pending task queue</h3>
            {queuedTasks.length === 0 ? (
              <p className="text-sm text-gf-muted">No queued tasks right now.</p>
            ) : queuedTasks
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
                  <Button size="sm" variant="secondary" onClick={() => startTransition(() => {
                    void copyDraft(draft.content)
                  })}>Copy draft</Button>
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
              <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                <p className="text-gf-muted">Marketing AI</p>
                <p className="mt-1 text-white">Scripted Reddit discovery stays cheap. OpenAI spend starts only when summaries or drafts are generated with your connected key.</p>
                <div className="mt-3 rounded-lg border border-gf-border bg-black/30 px-3 py-2 text-sm text-white">
                  API key: {snapshot.settings.has_openai_api_key ? `Connected${snapshot.settings.openai_api_key_last4 ? ` • ending ${snapshot.settings.openai_api_key_last4}` : ""}` : "Not connected"}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Input
                    label="OpenAI API key"
                    type="password"
                    placeholder={snapshot.settings.has_openai_api_key ? "Replace existing key" : "sk-..."}
                    value={runnerSettingsForm.openai_api_key}
                    onChange={(e) => setRunnerSettingsForm((current) => ({ ...current, openai_api_key: e.target.value }))}
                  />
                  <Select
                    label="Budget mode"
                    value={runnerSettingsForm.budget_mode}
                    onChange={(e) => setRunnerSettingsForm((current) => ({ ...current, budget_mode: e.target.value as "on" | "off" }))}
                    options={[
                      { value: "on", label: "On" },
                      { value: "off", label: "Off" },
                    ]}
                  />
                  <Select
                    label="Autoscan"
                    value={runnerSettingsForm.autoscan_enabled}
                    onChange={(e) => setRunnerSettingsForm((current) => ({ ...current, autoscan_enabled: e.target.value as "on" | "off" }))}
                    options={[
                      { value: "on", label: "On" },
                      { value: "off", label: "Off" },
                    ]}
                  />
                  <Input
                    label="Max draft variants"
                    type="number"
                    min="1"
                    max="3"
                    value={runnerSettingsForm.max_draft_variants}
                    onChange={(e) => setRunnerSettingsForm((current) => ({ ...current, max_draft_variants: e.target.value }))}
                  />
                  <Input
                    label="Discovery model"
                    value={runnerSettingsForm.discovery_model}
                    onChange={(e) => setRunnerSettingsForm((current) => ({ ...current, discovery_model: e.target.value }))}
                  />
                  <Input
                    label="Drafting model"
                    value={runnerSettingsForm.drafting_model}
                    onChange={(e) => setRunnerSettingsForm((current) => ({ ...current, drafting_model: e.target.value }))}
                  />
                  <Input
                    label="Revision model"
                    value={runnerSettingsForm.revision_model}
                    onChange={(e) => setRunnerSettingsForm((current) => ({ ...current, revision_model: e.target.value }))}
                  />
                  <Input
                    label="Max output tokens"
                    type="number"
                    min="150"
                    max="1200"
                    value={runnerSettingsForm.max_output_tokens}
                    onChange={(e) => setRunnerSettingsForm((current) => ({ ...current, max_output_tokens: e.target.value }))}
                  />
                  <TextArea
                    label="Reddit subreddits"
                    value={runnerSettingsForm.reddit_subreddits}
                    onChange={(e) => setRunnerSettingsForm((current) => ({ ...current, reddit_subreddits: e.target.value }))}
                  />
                  <TextArea
                    label="Reddit search terms"
                    value={runnerSettingsForm.reddit_search_terms}
                    onChange={(e) => setRunnerSettingsForm((current) => ({ ...current, reddit_search_terms: e.target.value }))}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={saveRunnerSettings} disabled={isPending}>
                    Save marketing AI settings
                  </Button>
                  {snapshot.settings.has_openai_api_key ? (
                    <Button size="sm" variant="ghost" onClick={() => startTransition(() => {
                      void saveMarketingSettings(true)
                    })} disabled={isPending}>
                      Remove API key
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRunnerSettingsForm(buildRunnerSettingsForm(snapshot.settings))}
                    disabled={isPending}
                  >
                    Load current settings
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setRunnerSettingsForm({
                        budget_mode: "on",
                        autoscan_enabled: "on",
                        discovery_model: "gpt-5-nano",
                        drafting_model: "gpt-5-mini",
                        revision_model: "gpt-5-mini",
                        max_draft_variants: "2",
                        max_output_tokens: "500",
                        reddit_subreddits: snapshot.settings.reddit.subreddits.join(", "),
                        reddit_search_terms: snapshot.settings.reddit.search_terms.join(", "),
                        openai_api_key: "",
                      })
                    }
                    disabled={isPending}
                  >
                    Reset to safe defaults
                  </Button>
                </div>
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
              <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                <p className="text-gf-muted">AI controls</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => runRunnerControl("trigger_scan", "Reddit scan triggered from the dashboard.")} disabled={isPending}>
                    Trigger Reddit scan
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => runRunnerControl("process_queue", "Runner told to process the queued work.")} disabled={isPending}>
                    Process queue
                  </Button>
                  {snapshot.runner.autoscan_enabled === false ? (
                    <Button size="sm" variant="secondary" onClick={() => runRunnerControl("resume_autoscan", "Autoscan resumed.")} disabled={isPending}>
                      Resume autoscan
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => runRunnerControl("pause_autoscan", "Autoscan paused.")} disabled={isPending}>
                      Pause autoscan
                    </Button>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                <p className="text-gf-muted">Run locally</p>
                <p className="mt-1 text-white">The website queues work and shows status. To actually execute AI tasks, run the local marketing runner on your machine:</p>
                <code className="mt-3 block rounded-lg bg-black/40 px-3 py-2 text-xs text-white">npm run runner:marketing</code>
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
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card glow>
              <p className="text-2xl font-bold">{snapshot.runner.status}</p>
              <p className="text-sm text-gf-muted mt-1">Runner state</p>
            </Card>
            <Card>
              <p className="text-2xl font-bold">{queuedTasks.length}</p>
              <p className="text-sm text-gf-muted mt-1">Tasks in motion</p>
            </Card>
            <Card>
              <p className="text-2xl font-bold">{reviewDrafts.length}</p>
              <p className="text-sm text-gf-muted mt-1">Drafts awaiting human review</p>
            </Card>
            <Card>
              <p className="text-2xl font-bold">{sentDrafts.length}</p>
              <p className="text-sm text-gf-muted mt-1">Completed sends logged</p>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>MCP Controls</CardTitle>
                <p className="text-sm text-gf-muted mt-1">Dashboard-issued commands for the local agent layer.</p>
              </CardHeader>
              <div className="space-y-4">
                <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <p className="text-sm text-gf-muted">Runner console</p>
                  <p className="mt-1 text-white">
                    {snapshot.runner.status === "offline"
                      ? "The dashboard can queue and direct work, but the local worker is not currently running."
                      : snapshot.runner.status === "blocked"
                        ? "The local worker started but failed startup diagnostics."
                        : "The local worker is connected and reporting into MCP."}
                  </p>
                </div>
                <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <p className="text-sm text-gf-muted">Current task</p>
                  <p className="mt-1 text-white">{snapshot.runner.current_task_key || "No active task"}</p>
                </div>
                <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <p className="text-sm text-gf-muted">Last heartbeat</p>
                  <p className="mt-1 text-white">{formatDate(snapshot.runner.heartbeat_at)}</p>
                </div>
                <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <p className="text-sm text-gf-muted">Last startup attempt</p>
                  <p className="mt-1 text-white">{formatDate(snapshot.runner.last_startup_attempt_at)}</p>
                  <p className="mt-2 text-sm text-gf-muted">Startup status</p>
                  <p className="mt-1 text-white">{snapshot.runner.last_startup_status || "Unknown"}</p>
                  <p className="mt-2 text-sm text-gf-muted">Startup message</p>
                  <p className="mt-1 text-white">{snapshot.runner.last_startup_message || "No startup message recorded yet."}</p>
                </div>
                <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <p className="text-sm text-gf-muted">Startup diagnostics</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gf-muted">Config loaded</span>
                      <span>{boolLabel(snapshot.runner.diagnostics?.config_loaded)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gf-muted">API key present</span>
                      <span>{boolLabel(snapshot.runner.diagnostics?.api_key_present)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gf-muted">OpenAI key present</span>
                      <span>{boolLabel(snapshot.runner.diagnostics?.openai_key_present)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gf-muted">Budget mode</span>
                      <span>{snapshot.runner.budget_mode === false ? "Off" : "On"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gf-muted">Memory API reachable</span>
                      <span>{boolLabel(snapshot.runner.diagnostics?.memory_api_reachable)}</span>
                    </div>
                    <div>
                      <p className="text-gf-muted">Model routing</p>
                      <p className="mt-1 text-white">
                        Discovery: {snapshot.runner.model_preferences?.discovery || "gpt-5-nano"} | Drafting: {snapshot.runner.model_preferences?.drafting || "gpt-5-mini"} | Revision: {snapshot.runner.model_preferences?.revision || "gpt-5-mini"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gf-muted">Output limits</p>
                      <p className="mt-1 text-white">
                        {snapshot.runner.output_limits?.max_draft_variants ?? 2} variants max | {snapshot.runner.output_limits?.max_output_tokens ?? 500} output tokens max
                      </p>
                    </div>
                    <div>
                      <p className="text-gf-muted">Memory base URL</p>
                      <p className="mt-1 text-white break-all">{snapshot.runner.diagnostics?.memory_base_url || "Not reported"}</p>
                    </div>
                    <div>
                      <p className="text-gf-muted">Reachability checked</p>
                      <p className="mt-1 text-white">{formatDate(snapshot.runner.diagnostics?.last_reachability_check_at)}</p>
                    </div>
                    <div>
                      <p className="text-gf-muted">Diagnostics summary</p>
                      <p className="mt-1 text-white">{snapshot.runner.diagnostics?.startup_message || "No diagnostics summary yet."}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <p className="text-sm text-gf-muted">Last dashboard control</p>
                  <p className="mt-1 text-white">{snapshot.runner.last_control_action || "None yet"}</p>
                  <p className="mt-1 text-xs text-gf-muted">{formatDate(snapshot.runner.control_requested_at)}</p>
                </div>
                <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <p className="text-sm text-gf-muted">Controls</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => runRunnerControl("trigger_scan", "Dashboard scan directive sent.")} disabled={isPending}>
                      Trigger scan
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => runRunnerControl("process_queue", "Dashboard queue directive sent.")} disabled={isPending}>
                      Run queued work
                    </Button>
                    {snapshot.runner.autoscan_enabled === false ? (
                      <Button size="sm" variant="secondary" onClick={() => runRunnerControl("resume_autoscan", "Dashboard resumed autoscan.")} disabled={isPending}>
                        Resume autoscan
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => runRunnerControl("pause_autoscan", "Dashboard paused autoscan.")} disabled={isPending}>
                        Pause autoscan
                      </Button>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <p className="text-sm text-gf-muted">Start this locally</p>
                  <p className="mt-1 text-white">Open a terminal in this project and run the worker in a visible window so you can watch startup and task output live:</p>
                  <code className="mt-3 block rounded-lg bg-black/40 px-3 py-2 text-xs text-white">npm run runner:marketing</code>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>MCP Flow Visuals</CardTitle>
                <p className="text-sm text-gf-muted mt-1">A live view of where work is moving through the Chameleon memory system.</p>
              </CardHeader>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-gf-muted">Discovery</p>
                  <p className="mt-2 text-2xl font-bold">{leads.length}</p>
                  <p className="mt-1 text-sm text-gf-muted">Lead records</p>
                </div>
                <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-gf-muted">Queue</p>
                  <p className="mt-2 text-2xl font-bold">{queuedTasks.length}</p>
                  <p className="mt-1 text-sm text-gf-muted">Open tasks</p>
                </div>
                <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-gf-muted">Drafting</p>
                  <p className="mt-2 text-2xl font-bold">{drafts.length}</p>
                  <p className="mt-1 text-sm text-gf-muted">Content entries</p>
                </div>
                <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-gf-muted">Closed Loop</p>
                  <p className="mt-2 text-2xl font-bold">{sentDrafts.length}</p>
                  <p className="mt-1 text-sm text-gf-muted">Sent outcomes</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <p className="text-sm font-semibold text-white">Runner actions</p>
                {snapshot.runner.recent_actions.length === 0 ? (
                  <p className="text-sm text-gf-muted">No agent actions recorded yet.</p>
                ) : (
                  snapshot.runner.recent_actions.map((action, index) => (
                    <div key={`${action}-${index}`} className="rounded-xl border border-gf-border bg-gf-black/20 p-4 text-sm text-white">
                      {action}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>MCP Audit Stream</CardTitle>
                <p className="text-sm text-gf-muted mt-1">Recent memory operations across state, content, leads, and messages.</p>
              </CardHeader>
              <div className="space-y-3">
                {snapshot.activity.audit.length === 0 ? (
                  <p className="text-sm text-gf-muted">No audit events yet.</p>
                ) : snapshot.activity.audit.map((event) => (
                  <div key={event.id} className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{event.summary || event.op}</p>
                        <p className="text-xs text-gf-muted mt-1">{event.sector || "system"} / {event.key || "n/a"} / {event.agent || "unknown"}</p>
                      </div>
                      <p className="text-xs text-gf-muted">{formatDate(event.ts)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>MCP Message Board</CardTitle>
                <p className="text-sm text-gf-muted mt-1">Directives, alerts, and runner broadcasts flowing through the message layer.</p>
              </CardHeader>
              <div className="space-y-3">
                {snapshot.messages.messages.length === 0 ? (
                  <p className="text-sm text-gf-muted">No message traffic yet.</p>
                ) : snapshot.messages.messages.map((message) => (
                  <div key={message.key} className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{message.data.tag}</p>
                        <p className="text-xs text-gf-muted mt-1">{message.data.sender} • {message.data.type} • {message.data.channel}</p>
                      </div>
                      <p className="text-xs text-gf-muted">{formatDate(message.created_at)}</p>
                    </div>
                    <p className="mt-3 text-sm whitespace-pre-wrap text-white/90">{message.data.content}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
