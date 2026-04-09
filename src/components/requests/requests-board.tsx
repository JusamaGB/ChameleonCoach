"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Input, Select, TextArea } from "@/components/ui/input"
import type {
  ContributorReward,
  ProductRequestDetail,
  ProductRequestStatus,
  ProductRequestType,
  ProductRequestUrgency,
  RequestContributor,
} from "@/types"
import {
  Bell,
  MessageSquare,
  Search,
  Sparkles,
  ThumbsUp,
  Trophy,
  Zap,
} from "lucide-react"

type BoardData = {
  viewer: {
    role: string
    coach_id: string | null
    client_id: string | null
    is_internal_admin: boolean
  }
  summary: {
    total_requests: number
    open_requests: number
    released_requests: number
    planned_requests: number
    total_votes: number
    total_comments: number
  }
  top_contributors: RequestContributor[]
  my_rewards: ContributorReward[]
  featured_requests: ProductRequestDetail[]
  requests: ProductRequestDetail[]
}

const MODULE_OPTIONS = [
  { value: "shared_core", label: "Shared Core" },
  { value: "pt_core", label: "PT Core" },
  { value: "nutrition_core", label: "Nutrition Core" },
  { value: "client_portal", label: "Client Portal" },
  { value: "appointments", label: "Appointments" },
  { value: "billing", label: "Billing" },
  { value: "branding", label: "Branding" },
  { value: "future_module", label: "Future Module" },
]

const URGENCY_OPTIONS: { value: ProductRequestUrgency; label: string }[] = [
  { value: "nice_to_have", label: "Nice to Have" },
  { value: "important", label: "Important" },
  { value: "high_impact", label: "High Impact" },
  { value: "blocking", label: "Blocking" },
]

const TYPE_OPTIONS: { value: ProductRequestType; label: string }[] = [
  { value: "new_feature", label: "New Feature" },
  { value: "module_expansion", label: "Module Expansion" },
  { value: "workflow_improvement", label: "Workflow Improvement" },
  { value: "ux_improvement", label: "UX Improvement" },
  { value: "bug_friction", label: "Bug / Friction" },
  { value: "integration", label: "Integration" },
  { value: "data_reporting", label: "Data / Reporting" },
]

const STATUS_OPTIONS: { value: ProductRequestStatus; label: string }[] = [
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "gathering_demand", label: "Gathering Demand" },
  { value: "planned", label: "Planned" },
  { value: "in_design", label: "In Design" },
  { value: "in_build", label: "In Build" },
  { value: "released", label: "Released" },
  { value: "merged", label: "Merged" },
  { value: "not_now", label: "Not Now" },
  { value: "declined", label: "Declined" },
]

const NICHE_OPTIONS = [
  { value: "general", label: "General" },
  { value: "personal_training", label: "Personal Training" },
  { value: "nutrition_coaching", label: "Nutrition Coaching" },
  { value: "hybrid_coach", label: "Hybrid Coach" },
  { value: "sports_performance", label: "Sports Performance" },
  { value: "rehab_corrective", label: "Rehab / Corrective" },
  { value: "studio_gym", label: "Studio / Gym" },
  { value: "group_coaching", label: "Group Coaching" },
]

const REWARD_OPTIONS = [
  { value: "account_credit", label: "Account Credit" },
  { value: "extended_trial", label: "Extended Trial" },
  { value: "free_month", label: "Free Month" },
  { value: "module_unlock", label: "Module Unlock" },
  { value: "premium_access", label: "Premium Access" },
  { value: "early_access", label: "Early Access" },
  { value: "contributor_badge", label: "Contributor Badge" },
]

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "most_voted", label: "Most Voted" },
  { value: "trending", label: "Trending" },
  { value: "recently_updated", label: "Recently Updated" },
  { value: "planned", label: "Planned" },
  { value: "released", label: "Released" },
]

const EMPTY_CREATE = {
  title: "",
  summary: "",
  problem_statement: "",
  desired_outcome: "",
  module_area: "shared_core",
  feature_area: "",
  urgency: "important" as ProductRequestUrgency,
  niche: "general",
  request_type: "workflow_improvement" as ProductRequestType,
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function statusTone(status: ProductRequestStatus) {
  switch (status) {
    case "released":
      return "success"
    case "in_build":
    case "planned":
    case "in_design":
      return "pink"
    default:
      return "default"
  }
}

export function RequestsBoard({
  initialData,
  variant,
}: {
  initialData: BoardData
  variant: "coach" | "client"
}) {
  const [data, setData] = useState<BoardData>(initialData)
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState(initialData.requests[0]?.id ?? null)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [moduleFilter, setModuleFilter] = useState("all")
  const [urgencyFilter, setUrgencyFilter] = useState("all")
  const [sort, setSort] = useState("newest")
  const [mineOnly, setMineOnly] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE)
  const [commentBody, setCommentBody] = useState("")
  const [moderationForm, setModerationForm] = useState({
    status: "submitted" as ProductRequestStatus,
    public_note: "",
    implementation_note: "",
    duplicate_of_request_id: "",
  })
  const [rewardForm, setRewardForm] = useState({
    reward_type: "account_credit",
    title: "",
    description: "",
    reward_value: "",
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const selectedRequest = useMemo(
    () => data.requests.find((request) => request.id === selectedId) ?? data.requests[0] ?? null,
    [data.requests, selectedId]
  )

  useEffect(() => {
    if (selectedRequest) {
      setModerationForm({
        status: selectedRequest.status,
        public_note: selectedRequest.public_note ?? "",
        implementation_note: selectedRequest.implementation_note ?? "",
        duplicate_of_request_id: selectedRequest.duplicate_of_request_id ?? "",
      })
    }
  }, [selectedRequest])

  async function refreshBoard(preferredId?: string) {
    setLoading(true)
    setError("")

    try {
      const params = new URLSearchParams()
      if (query) params.set("q", query)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (moduleFilter !== "all") params.set("module_area", moduleFilter)
      if (urgencyFilter !== "all") params.set("urgency", urgencyFilter)
      if (sort !== "newest") params.set("sort", sort)
      if (mineOnly) params.set("mine", "1")

      const response = await fetch(`/api/requests?${params.toString()}`, { cache: "no-store" })
      const next = await response.json()
      if (!response.ok) {
        throw new Error(next.error || "Failed to refresh requests")
      }

      setData(next)
      setSelectedId((current) => {
        if (preferredId && next.requests.some((request: ProductRequestDetail) => request.id === preferredId)) {
          return preferredId
        }
        if (current && next.requests.some((request: ProductRequestDetail) => request.id === current)) {
          return current
        }
        return next.requests[0]?.id ?? null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh requests")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateRequest(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create request")
      }

      setCreateForm(EMPTY_CREATE)
      setSuccess("Request submitted")
      await refreshBoard(payload.request?.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create request")
    }
  }

  async function toggleVote(request: ProductRequestDetail) {
    const method = request.viewer_has_voted ? "DELETE" : "POST"
    const response = await fetch(`/api/requests/${request.id}/vote`, { method })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(payload.error || "Failed to update vote")
      return
    }
    await refreshBoard(request.id)
  }

  async function toggleFollow(request: ProductRequestDetail) {
    const method = request.viewer_is_following ? "DELETE" : "POST"
    const response = await fetch(`/api/requests/${request.id}/follow`, { method })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(payload.error || "Failed to update follow")
      return
    }
    await refreshBoard(request.id)
  }

  async function addComment(event: React.FormEvent) {
    event.preventDefault()
    if (!selectedRequest || !commentBody.trim()) return

    const response = await fetch(`/api/requests/${selectedRequest.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentBody }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(payload.error || "Failed to add comment")
      return
    }

    setCommentBody("")
    await refreshBoard(selectedRequest.id)
  }

  async function saveModeration(event: React.FormEvent) {
    event.preventDefault()
    if (!selectedRequest) return

    const response = await fetch(`/api/requests/${selectedRequest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(moderationForm),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(payload.error || "Failed to update request")
      return
    }

    setSuccess("Request updated")
    await refreshBoard(selectedRequest.id)
  }

  async function grantReward(event: React.FormEvent) {
    event.preventDefault()
    if (!selectedRequest || !selectedRequest.requester_user_id) return

    const response = await fetch(`/api/requests/${selectedRequest.id}/reward`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: selectedRequest.requester_user_id,
        ...rewardForm,
      }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(payload.error || "Failed to grant reward")
      return
    }

    setRewardForm({
      reward_type: "account_credit",
      title: "",
      description: "",
      reward_value: "",
    })
    setSuccess("Reward granted")
    await refreshBoard(selectedRequest.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {variant === "coach" ? "Requests" : "Community Requests"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-gf-muted">
            Share product needs, support other coaches, and track what the platform is reviewing, planning, building, or releasing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{data.viewer.role === "client" ? "Client voice" : "Coach voice"}</Badge>
          <Badge variant={data.viewer.is_internal_admin ? "success" : "default"}>
            {data.viewer.is_internal_admin ? "Moderation enabled" : "Community mode"}
          </Badge>
        </div>
      </div>

      {(error || success) && (
        <Card className={error ? "border-red-500/40" : "border-green-500/30"}>
          <p className={error ? "text-sm text-red-300" : "text-sm text-green-300"}>{error || success}</p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-gf-muted">Open Requests</p>
          <p className="mt-2 text-2xl font-bold text-white">{data.summary.open_requests}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-gf-muted">Planned / In Build</p>
          <p className="mt-2 text-2xl font-bold text-white">{data.summary.planned_requests}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-gf-muted">Released</p>
          <p className="mt-2 text-2xl font-bold text-white">{data.summary.released_requests}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-gf-muted">Community Votes</p>
          <p className="mt-2 text-2xl font-bold text-white">{data.summary.total_votes}</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_380px]">
        <div className="space-y-6">
          <Card glow>
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-gf-pink" />
              <CardTitle>Submit a Request</CardTitle>
            </div>
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <Input
                label="Title"
                value={createForm.title}
                onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="What do you need?"
                required
              />
              <Input
                label="Short Summary"
                value={createForm.summary}
                onChange={(event) => setCreateForm((current) => ({ ...current, summary: event.target.value }))}
                placeholder="One-line description people can scan quickly."
              />
              <TextArea
                label="Problem Statement"
                value={createForm.problem_statement}
                onChange={(event) => setCreateForm((current) => ({ ...current, problem_statement: event.target.value }))}
                placeholder="Describe the friction, workflow gap, or necessity."
                required
              />
              <TextArea
                label="Desired Outcome"
                value={createForm.desired_outcome}
                onChange={(event) => setCreateForm((current) => ({ ...current, desired_outcome: event.target.value }))}
                placeholder="What would a good result look like?"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Module Area"
                  value={createForm.module_area}
                  onChange={(event) => setCreateForm((current) => ({ ...current, module_area: event.target.value }))}
                  options={MODULE_OPTIONS}
                />
                <Input
                  label="Feature Area"
                  value={createForm.feature_area}
                  onChange={(event) => setCreateForm((current) => ({ ...current, feature_area: event.target.value }))}
                  placeholder="Optional sub-area or workflow"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Select
                  label="Urgency"
                  value={createForm.urgency}
                  onChange={(event) => setCreateForm((current) => ({ ...current, urgency: event.target.value as ProductRequestUrgency }))}
                  options={URGENCY_OPTIONS}
                />
                <Select
                  label="Niche"
                  value={createForm.niche}
                  onChange={(event) => setCreateForm((current) => ({ ...current, niche: event.target.value }))}
                  options={NICHE_OPTIONS}
                />
                <Select
                  label="Request Type"
                  value={createForm.request_type}
                  onChange={(event) => setCreateForm((current) => ({ ...current, request_type: event.target.value as ProductRequestType }))}
                  options={TYPE_OPTIONS}
                />
              </div>
              <Button type="submit" disabled={loading}>
                {variant === "coach" ? "Submit Request" : "Share Request"}
              </Button>
            </form>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <CardTitle>Request Board</CardTitle>
                <p className="mt-1 text-sm text-gf-muted">
                  Vote, follow, and filter by module, urgency, and status.
                </p>
              </div>
              <Badge>{data.requests.length} shown</Badge>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
              <div className="space-y-1.5">
                <label htmlFor="request-search" className="block text-sm font-medium text-gf-muted">
                  Search
                </label>
                <div className="relative">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gf-muted" />
                  <input
                    id="request-search"
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search requests..."
                    className="w-full rounded-lg border border-gf-border bg-gf-surface py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-gf-muted/50 focus:border-gf-pink focus:outline-none focus:ring-1 focus:ring-gf-pink/30"
                  />
                </div>
              </div>
              <Select
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                options={[{ value: "all", label: "All statuses" }, ...STATUS_OPTIONS]}
              />
              <Select
                label="Module"
                value={moduleFilter}
                onChange={(event) => setModuleFilter(event.target.value)}
                options={[{ value: "all", label: "All modules" }, ...MODULE_OPTIONS]}
              />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[180px_180px_160px_auto]">
              <Select
                label="Urgency"
                value={urgencyFilter}
                onChange={(event) => setUrgencyFilter(event.target.value)}
                options={[{ value: "all", label: "All urgency" }, ...URGENCY_OPTIONS]}
              />
              <Select
                label="Sort"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                options={SORT_OPTIONS}
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gf-muted">Mine Only</label>
                <Button
                  type="button"
                  variant={mineOnly ? "primary" : "secondary"}
                  className="w-full"
                  onClick={() => setMineOnly((current) => !current)}
                >
                  {mineOnly ? "Showing mine" : "Show mine"}
                </Button>
              </div>
              <div className="flex items-end">
                <Button type="button" variant="secondary" onClick={() => refreshBoard()}>
                  {loading ? "Refreshing..." : "Refresh Board"}
                </Button>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {data.requests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gf-border bg-gf-black/10 px-5 py-8">
                  <p className="text-sm font-medium text-white">No requests match this view</p>
                  <p className="mt-2 text-sm text-gf-muted">
                    Clear some filters or submit the first request for this workflow need.
                  </p>
                </div>
              ) : (
                data.requests.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedId(request.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                      selectedRequest?.id === request.id
                        ? "border-gf-pink/40 bg-gf-pink/5"
                        : "border-gf-border bg-gf-black/10 hover:border-gf-pink/20"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-white">{request.title}</p>
                          <Badge variant={statusTone(request.status)}>{formatLabel(request.status)}</Badge>
                          <Badge>{formatLabel(request.module_area)}</Badge>
                          <Badge>{formatLabel(request.urgency)}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-gf-muted">
                          {request.summary || request.problem_statement}
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-wide text-gf-muted">
                          {request.requester_display_name} • {formatLabel(request.niche)} • {formatLabel(request.request_type)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-gf-muted">
                        <span className="inline-flex items-center gap-1"><ThumbsUp size={13} /> {request.vote_count}</span>
                        <span className="inline-flex items-center gap-1"><MessageSquare size={13} /> {request.comment_count}</span>
                        <span className="inline-flex items-center gap-1"><Bell size={13} /> {request.follower_count}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Zap size={18} className="text-gf-pink" />
              <CardTitle>Featured Requests</CardTitle>
            </div>
            <div className="space-y-3">
              {data.featured_requests.length === 0 ? (
                <p className="text-sm text-gf-muted">Featured requests will appear here as the board grows.</p>
              ) : (
                data.featured_requests.slice(0, 3).map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedId(request.id)}
                    className="w-full rounded-xl border border-gf-border bg-gf-black/10 p-4 text-left"
                  >
                    <p className="font-medium text-white">{request.title}</p>
                    <p className="mt-1 text-sm text-gf-muted">{request.summary || request.problem_statement}</p>
                  </button>
                ))
              )}
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-gf-pink" />
              <CardTitle>Top Contributors</CardTitle>
            </div>
            <div className="space-y-3">
              {data.top_contributors.map((contributor) => (
                <div key={`${contributor.user_id ?? contributor.display_name}`} className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                  <p className="font-medium text-white">{contributor.display_name}</p>
                  <p className="mt-1 text-sm text-gf-muted">
                    {contributor.requests_count} requests • {contributor.implemented_count} shipped • {contributor.total_votes_received} votes earned
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-gf-pink" />
              <CardTitle>Your Rewards</CardTitle>
            </div>
            {data.my_rewards.length === 0 ? (
              <p className="text-sm text-gf-muted">
                Rewards show up here when one of your contributions materially shapes shipped work.
              </p>
            ) : (
              <div className="space-y-3">
                {data.my_rewards.map((reward) => (
                  <div key={reward.id} className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                    <p className="font-medium text-white">{reward.title}</p>
                    <p className="mt-1 text-sm text-gf-muted">
                      {formatLabel(reward.reward_type)}{reward.reward_value ? ` • ${reward.reward_value}` : ""}
                    </p>
                    {reward.description ? (
                      <p className="mt-2 text-sm text-gf-muted">{reward.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {selectedRequest ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{selectedRequest.title}</CardTitle>
                  <Badge variant={statusTone(selectedRequest.status)}>{formatLabel(selectedRequest.status)}</Badge>
                </div>
                <p className="mt-2 text-sm text-gf-muted">
                  Submitted by {selectedRequest.requester_display_name} • {formatLabel(selectedRequest.module_area)} • {formatLabel(selectedRequest.niche)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={selectedRequest.viewer_has_voted ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => toggleVote(selectedRequest)}
                >
                  <ThumbsUp size={14} className="mr-1.5" />
                  {selectedRequest.viewer_has_voted ? "Voted" : "Vote"} ({selectedRequest.vote_count})
                </Button>
                <Button
                  type="button"
                  variant={selectedRequest.viewer_is_following ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => toggleFollow(selectedRequest)}
                >
                  <Bell size={14} className="mr-1.5" />
                  {selectedRequest.viewer_is_following ? "Following" : "Follow"}
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                <p className="text-xs uppercase tracking-wide text-gf-muted">Problem</p>
                <p className="mt-2 text-sm text-white">{selectedRequest.problem_statement}</p>
              </div>
              <div className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                <p className="text-xs uppercase tracking-wide text-gf-muted">Desired Outcome</p>
                <p className="mt-2 text-sm text-white">
                  {selectedRequest.desired_outcome || "No desired outcome added yet."}
                </p>
              </div>
              <div className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                <p className="text-xs uppercase tracking-wide text-gf-muted">Meta</p>
                <p className="mt-2 text-sm text-white">
                  {formatLabel(selectedRequest.request_type)} • {formatLabel(selectedRequest.urgency)}
                </p>
                {selectedRequest.public_note ? (
                  <p className="mt-2 text-sm text-gf-muted">{selectedRequest.public_note}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <CardTitle className="text-base">Discussion</CardTitle>
                <p className="text-sm text-gf-muted">{selectedRequest.comments.length} comments</p>
              </div>
              <div className="space-y-3">
                {selectedRequest.comments.length === 0 ? (
                  <p className="text-sm text-gf-muted">Be the first to add use-case context or supporting detail.</p>
                ) : (
                  selectedRequest.comments.map((comment) => (
                    <div key={comment.id} className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-white">{comment.author_display_name}</p>
                        <p className="text-xs text-gf-muted">{new Date(comment.created_at).toLocaleDateString()}</p>
                      </div>
                      <p className="mt-2 text-sm text-gf-muted">{comment.body}</p>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={addComment} className="mt-4 space-y-3">
                <TextArea
                  label="Add context"
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder="Add a real workflow example, edge case, or why this matters."
                />
                <Button type="submit">Post Comment</Button>
              </form>
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardTitle className="mb-4">Status History</CardTitle>
              <div className="space-y-3">
                {selectedRequest.status_history.length === 0 ? (
                  <p className="text-sm text-gf-muted">Status changes will appear here as this request moves.</p>
                ) : (
                  selectedRequest.status_history.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                      <p className="font-medium text-white">
                        {entry.from_status ? `${formatLabel(entry.from_status)} → ` : ""}{formatLabel(entry.to_status)}
                      </p>
                      {entry.note ? <p className="mt-2 text-sm text-gf-muted">{entry.note}</p> : null}
                      <p className="mt-2 text-xs text-gf-muted">{new Date(entry.created_at).toLocaleDateString()}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {selectedRequest.rewards.length > 0 && (
              <Card>
                <CardTitle className="mb-4">Rewards Issued</CardTitle>
                <div className="space-y-3">
                  {selectedRequest.rewards.map((reward) => (
                    <div key={reward.id} className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                      <p className="font-medium text-white">{reward.title}</p>
                      <p className="mt-1 text-sm text-gf-muted">
                        {formatLabel(reward.reward_type)}{reward.reward_value ? ` • ${reward.reward_value}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {data.viewer.is_internal_admin && (
              <>
                <Card>
                  <CardTitle className="mb-4">Moderation</CardTitle>
                  <form onSubmit={saveModeration} className="space-y-4">
                    <Select
                      label="Status"
                      value={moderationForm.status}
                      onChange={(event) => setModerationForm((current) => ({ ...current, status: event.target.value as ProductRequestStatus }))}
                      options={STATUS_OPTIONS}
                    />
                    <TextArea
                      label="Public Note"
                      value={moderationForm.public_note}
                      onChange={(event) => setModerationForm((current) => ({ ...current, public_note: event.target.value }))}
                      placeholder="Visible reasoning or current product note"
                    />
                    <TextArea
                      label="Implementation Note"
                      value={moderationForm.implementation_note}
                      onChange={(event) => setModerationForm((current) => ({ ...current, implementation_note: event.target.value }))}
                      placeholder="What shipped or what still needs to happen"
                    />
                    <Input
                      label="Duplicate Of Request ID"
                      value={moderationForm.duplicate_of_request_id}
                      onChange={(event) => setModerationForm((current) => ({ ...current, duplicate_of_request_id: event.target.value }))}
                      placeholder="Optional canonical request id"
                    />
                    <Button type="submit">Save Request</Button>
                  </form>
                </Card>

                {selectedRequest.requester_user_id && (
                  <Card>
                    <CardTitle className="mb-4">Contributor Reward</CardTitle>
                    <form onSubmit={grantReward} className="space-y-4">
                      <Select
                        label="Reward Type"
                        value={rewardForm.reward_type}
                        onChange={(event) => setRewardForm((current) => ({ ...current, reward_type: event.target.value }))}
                        options={REWARD_OPTIONS}
                      />
                      <Input
                        label="Reward Title"
                        value={rewardForm.title}
                        onChange={(event) => setRewardForm((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Implemented contributor credit"
                      />
                      <Input
                        label="Reward Value"
                        value={rewardForm.reward_value}
                        onChange={(event) => setRewardForm((current) => ({ ...current, reward_value: event.target.value }))}
                        placeholder="e.g. 1 month free, PT module unlock"
                      />
                      <TextArea
                        label="Reward Note"
                        value={rewardForm.description}
                        onChange={(event) => setRewardForm((current) => ({ ...current, description: event.target.value }))}
                        placeholder="Why this contributor is being rewarded"
                      />
                      <Button type="submit">Grant Reward</Button>
                    </form>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
