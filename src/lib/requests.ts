import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  ContributorReward,
  ProductRequest,
  ProductRequestComment,
  ProductRequestDetail,
  ProductRequestRole,
  ProductRequestStatus,
  ProductRequestStatusHistory,
  ProductRequestType,
  ProductRequestUrgency,
  RequestContributor,
} from "@/types"

const INTERNAL_ADMIN_EMAILS = ["kris.deane93@gmail.com"]

type ViewerContext = {
  userId: string
  role: ProductRequestRole
  coachId: string | null
  clientId: string | null
  isInternalAdmin: boolean
}

type BoardFilters = {
  q?: string
  status?: string
  module_area?: string
  urgency?: string
  sort?: string
  mine?: boolean
}

type CreateRequestInput = {
  title: string
  summary?: string | null
  problem_statement: string
  desired_outcome?: string | null
  module_area: string
  feature_area?: string | null
  urgency: ProductRequestUrgency
  niche: string
  request_type: ProductRequestType
}

type UpdateRequestInput = Partial<CreateRequestInput> & {
  status?: ProductRequestStatus
  public_note?: string | null
  implementation_note?: string | null
  reward_state?: "none" | "under_review" | "eligible" | "granted"
  duplicate_of_request_id?: string | null
}

type RewardInput = {
  reward_type: ContributorReward["reward_type"]
  title: string
  description?: string | null
  reward_value?: string | null
  user_id: string
  expires_at?: string | null
}

function toDisplayName(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

function normalizeSearch(value: string | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

function trendingScore(request: ProductRequestDetail) {
  const ageHours = Math.max(
    1,
    (Date.now() - new Date(request.created_at).getTime()) / (1000 * 60 * 60)
  )
  const urgencyBonus =
    request.urgency === "blocking"
      ? 5
      : request.urgency === "high_impact"
        ? 3
        : request.urgency === "important"
          ? 2
          : 1

  return (request.vote_count * 5 + request.comment_count * 2 + request.follower_count * 3 + urgencyBonus) / ageHours
}

export function isInternalAdminUser(email?: string | null) {
  return !!email && INTERNAL_ADMIN_EMAILS.includes(email.toLowerCase())
}

export async function getRequestViewerContext(
  supabase: SupabaseClient,
  userId: string,
  userEmail?: string | null
): Promise<ViewerContext> {
  const { data: roleRow, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle()

  if (roleError) {
    throw new Error(roleError.message)
  }

  const role = (roleRow?.role ?? "client") as ProductRequestRole
  if (role === "coach" || role === "admin") {
    return {
      userId,
      role,
      coachId: userId,
      clientId: null,
      isInternalAdmin: role === "admin" || isInternalAdminUser(userEmail),
    }
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, coach_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (clientError) {
    throw new Error(clientError.message)
  }

  return {
    userId,
    role: "client",
    coachId: client?.coach_id ?? null,
    clientId: client?.id ?? null,
    isInternalAdmin: isInternalAdminUser(userEmail),
  }
}

async function getRequesterDisplayNames(
  supabase: SupabaseClient,
  requests: ProductRequest[]
) {
  const coachUserIds = Array.from(
    new Set(
      requests
        .filter((request) => request.requester_user_id && request.requester_role !== "client")
        .map((request) => request.requester_user_id!)
    )
  )

  const clientUserIds = Array.from(
    new Set(
      requests
        .filter((request) => request.requester_user_id && request.requester_role === "client")
        .map((request) => request.requester_user_id!)
    )
  )

  const [settingsRes, clientsRes] = await Promise.all([
    coachUserIds.length > 0
      ? supabase
          .from("admin_settings")
          .select("user_id, display_name, business_name")
          .in("user_id", coachUserIds)
      : Promise.resolve({ data: [], error: null }),
    clientUserIds.length > 0
      ? supabase
          .from("clients")
          .select("user_id, name")
          .in("user_id", clientUserIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (settingsRes.error) {
    throw new Error(settingsRes.error.message)
  }
  if (clientsRes.error) {
    throw new Error(clientsRes.error.message)
  }

  const names = new Map<string, string>()
  for (const row of settingsRes.data ?? []) {
    names.set(row.user_id, toDisplayName(row.display_name ?? row.business_name, "Coach contributor"))
  }
  for (const row of clientsRes.data ?? []) {
    if (row.user_id) {
      names.set(row.user_id, toDisplayName(row.name, "Client contributor"))
    }
  }
  return names
}

export async function getRequestsBoardData(
  supabase: SupabaseClient,
  viewer: ViewerContext,
  filters: BoardFilters = {}
) {
  const { data: requests, error } = await supabase
    .from("product_requests")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const allRequests = (requests ?? []) as ProductRequest[]
  const requestIds = allRequests.map((request) => request.id)

  const [votesRes, commentsRes, followsRes, historyRes, rewardsRes] = await Promise.all([
    requestIds.length > 0
      ? supabase.from("product_request_votes").select("*").in("request_id", requestIds)
      : Promise.resolve({ data: [], error: null }),
    requestIds.length > 0
      ? supabase.from("product_request_comments").select("*").in("request_id", requestIds).order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    requestIds.length > 0
      ? supabase.from("product_request_follows").select("*").in("request_id", requestIds)
      : Promise.resolve({ data: [], error: null }),
    requestIds.length > 0
      ? supabase.from("product_request_status_history").select("*").in("request_id", requestIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    requestIds.length > 0
      ? supabase.from("contributor_rewards").select("*").in("request_id", requestIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  for (const result of [votesRes, commentsRes, followsRes, historyRes, rewardsRes]) {
    if (result.error) {
      throw new Error(result.error.message)
    }
  }

  const requestDisplayNames = await getRequesterDisplayNames(supabase, allRequests)

  const votes = (votesRes.data ?? []) as Array<{ request_id: string; user_id: string }>
  const comments = (commentsRes.data ?? []) as ProductRequestComment[]
  const follows = (followsRes.data ?? []) as Array<{ request_id: string; user_id: string }>
  const history = (historyRes.data ?? []) as ProductRequestStatusHistory[]
  const rewards = (rewardsRes.data ?? []) as ContributorReward[]

  const voteCountByRequest = new Map<string, number>()
  const commentCountByRequest = new Map<string, number>()
  const followCountByRequest = new Map<string, number>()
  const viewerVoted = new Set<string>()
  const viewerFollowing = new Set<string>()

  for (const vote of votes) {
    voteCountByRequest.set(vote.request_id, (voteCountByRequest.get(vote.request_id) ?? 0) + 1)
    if (vote.user_id === viewer.userId) {
      viewerVoted.add(vote.request_id)
    }
  }

  for (const comment of comments) {
    commentCountByRequest.set(comment.request_id, (commentCountByRequest.get(comment.request_id) ?? 0) + 1)
  }

  for (const follow of follows) {
    followCountByRequest.set(follow.request_id, (followCountByRequest.get(follow.request_id) ?? 0) + 1)
    if (follow.user_id === viewer.userId) {
      viewerFollowing.add(follow.request_id)
    }
  }

  const commentsByRequest = new Map<string, Array<ProductRequestComment & { author_display_name: string }>>()
  for (const comment of comments) {
    const entry = commentsByRequest.get(comment.request_id) ?? []
    entry.push({
      ...comment,
      author_display_name: requestDisplayNames.get(comment.user_id) ?? (comment.role === "client" ? "Client contributor" : "Coach contributor"),
    })
    commentsByRequest.set(comment.request_id, entry)
  }

  const historyByRequest = new Map<string, ProductRequestStatusHistory[]>()
  for (const row of history) {
    const entry = historyByRequest.get(row.request_id) ?? []
    entry.push(row)
    historyByRequest.set(row.request_id, entry)
  }

  const rewardsByRequest = new Map<string, ContributorReward[]>()
  for (const reward of rewards) {
    if (!reward.request_id) continue
    const entry = rewardsByRequest.get(reward.request_id) ?? []
    entry.push(reward)
    rewardsByRequest.set(reward.request_id, entry)
  }

  const detailedRequests: ProductRequestDetail[] = allRequests.map((request) => ({
    ...request,
    vote_count: voteCountByRequest.get(request.id) ?? 0,
    comment_count: commentCountByRequest.get(request.id) ?? 0,
    follower_count: followCountByRequest.get(request.id) ?? 0,
    viewer_has_voted: viewerVoted.has(request.id),
    viewer_is_following: viewerFollowing.has(request.id),
    requester_display_name:
      requestDisplayNames.get(request.requester_user_id ?? "") ??
      (request.requester_role === "client" ? "Client contributor" : "Coach contributor"),
    comments: commentsByRequest.get(request.id) ?? [],
    status_history: historyByRequest.get(request.id) ?? [],
    rewards: rewardsByRequest.get(request.id) ?? [],
  }))

  const search = normalizeSearch(filters.q)
  let filtered = detailedRequests.filter((request) => {
    if (filters.mine && request.requester_user_id !== viewer.userId) {
      return false
    }
    if (filters.status && filters.status !== "all" && request.status !== filters.status) {
      return false
    }
    if (filters.module_area && filters.module_area !== "all" && request.module_area !== filters.module_area) {
      return false
    }
    if (filters.urgency && filters.urgency !== "all" && request.urgency !== filters.urgency) {
      return false
    }
    if (!search) {
      return true
    }
    const haystack = [
      request.title,
      request.summary ?? "",
      request.problem_statement,
      request.desired_outcome ?? "",
      request.module_area,
      request.feature_area ?? "",
      request.niche,
      request.request_type,
      request.requester_display_name,
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(search)
  })

  switch (filters.sort) {
    case "most_voted":
      filtered = filtered.sort((a, b) => b.vote_count - a.vote_count || b.comment_count - a.comment_count)
      break
    case "trending":
      filtered = filtered.sort((a, b) => trendingScore(b) - trendingScore(a))
      break
    case "most_urgent":
      filtered = filtered.sort((a, b) => trendingScore(b) - trendingScore(a))
      break
    case "recently_updated":
      filtered = filtered.sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
      break
    case "planned":
      filtered = filtered
        .filter((request) => ["planned", "in_design", "in_build"].includes(request.status))
        .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
      break
    case "released":
      filtered = filtered
        .filter((request) => request.status === "released")
        .sort((a, b) => +new Date(b.implemented_at ?? b.updated_at) - +new Date(a.implemented_at ?? a.updated_at))
      break
    default:
      filtered = filtered.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
  }

  const summary = {
    total_requests: detailedRequests.length,
    open_requests: detailedRequests.filter((request) =>
      !["released", "declined", "not_now", "merged"].includes(request.status)
    ).length,
    released_requests: detailedRequests.filter((request) => request.status === "released").length,
    planned_requests: detailedRequests.filter((request) =>
      ["planned", "in_design", "in_build"].includes(request.status)
    ).length,
    total_votes: votes.length,
    total_comments: comments.length,
  }

  const contributorMap = new Map<string, RequestContributor>()
  for (const request of detailedRequests) {
    const key = request.requester_user_id ?? `${request.requester_role}-${request.id}`
    const current = contributorMap.get(key) ?? {
      user_id: request.requester_user_id,
      role: request.requester_role,
      display_name: request.requester_display_name,
      requests_count: 0,
      implemented_count: 0,
      total_votes_received: 0,
    }
    current.requests_count += 1
    current.total_votes_received += request.vote_count
    if (request.status === "released") {
      current.implemented_count += 1
    }
    contributorMap.set(key, current)
  }

  const topContributors = Array.from(contributorMap.values())
    .sort((a, b) =>
      b.implemented_count - a.implemented_count
      || b.total_votes_received - a.total_votes_received
      || b.requests_count - a.requests_count
    )
    .slice(0, 8)

  const myRewards = rewards
    .filter((reward) => reward.user_id === viewer.userId)
    .sort((a, b) => +new Date(b.granted_at) - +new Date(a.granted_at))

  return {
    viewer: {
      role: viewer.role,
      coach_id: viewer.coachId,
      client_id: viewer.clientId,
      is_internal_admin: viewer.isInternalAdmin,
    },
    summary,
    top_contributors: topContributors,
    my_rewards: myRewards,
    requests: filtered,
    featured_requests: detailedRequests
      .filter((request) => ["planned", "in_build", "released"].includes(request.status))
      .sort((a, b) => trendingScore(b) - trendingScore(a))
      .slice(0, 5),
  }
}

export async function createProductRequest(
  supabase: SupabaseClient,
  viewer: ViewerContext,
  input: CreateRequestInput
) {
  const payload = {
    title: input.title.trim(),
    summary: input.summary?.trim() || null,
    problem_statement: input.problem_statement.trim(),
    desired_outcome: input.desired_outcome?.trim() || null,
    requester_user_id: viewer.userId,
    requester_role: viewer.role,
    coach_id: viewer.coachId,
    client_id: viewer.clientId,
    module_area: input.module_area,
    feature_area: input.feature_area?.trim() || null,
    urgency: input.urgency,
    niche: input.niche,
    request_type: input.request_type,
  }

  const { data, error } = await supabase
    .from("product_requests")
    .insert(payload)
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create request")
  }

  await supabase.from("product_request_status_history").insert({
    request_id: data.id,
    from_status: null,
    to_status: "submitted",
    note: "Request created",
    changed_by_user_id: viewer.userId,
  })

  return data as ProductRequest
}

export async function updateProductRequest(
  supabase: SupabaseClient,
  viewer: ViewerContext,
  requestId: string,
  input: UpdateRequestInput
) {
  const { data: existing, error: fetchError } = await supabase
    .from("product_requests")
    .select("*")
    .eq("id", requestId)
    .single()

  if (fetchError || !existing) {
    throw new Error(fetchError?.message ?? "Request not found")
  }

  const canEditOwn =
    existing.requester_user_id === viewer.userId
    && ["submitted", "under_review", "gathering_demand"].includes(existing.status)
  if (!canEditOwn && !viewer.isInternalAdmin) {
    throw new Error("You do not have permission to update this request")
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  for (const field of [
    "title",
    "summary",
    "problem_statement",
    "desired_outcome",
    "module_area",
    "feature_area",
    "urgency",
    "niche",
    "request_type",
  ] as const) {
    if (field in input && input[field] !== undefined) {
      const value = input[field]
      updates[field] = typeof value === "string" ? value.trim() : value
    }
  }

  if (viewer.isInternalAdmin) {
    if (input.status) updates.status = input.status
    if ("public_note" in input) updates.public_note = input.public_note ?? null
    if ("implementation_note" in input) updates.implementation_note = input.implementation_note ?? null
    if ("reward_state" in input) updates.reward_state = input.reward_state ?? "none"
    if ("duplicate_of_request_id" in input) updates.duplicate_of_request_id = input.duplicate_of_request_id ?? null
    if (input.status === "released") {
      updates.implemented_at = new Date().toISOString()
    }
  }

  const { data: updated, error } = await supabase
    .from("product_requests")
    .update(updates)
    .eq("id", requestId)
    .select("*")
    .single()

  if (error || !updated) {
    throw new Error(error?.message ?? "Failed to update request")
  }

  if (viewer.isInternalAdmin && input.status && input.status !== existing.status) {
    await supabase.from("product_request_status_history").insert({
      request_id: requestId,
      from_status: existing.status,
      to_status: input.status,
      note: input.public_note ?? null,
      changed_by_user_id: viewer.userId,
    })
  }

  return updated as ProductRequest
}

export async function toggleProductRequestVote(
  supabase: SupabaseClient,
  viewer: ViewerContext,
  requestId: string,
  shouldVote: boolean
) {
  if (shouldVote) {
    const { error } = await supabase
      .from("product_request_votes")
      .upsert({ request_id: requestId, user_id: viewer.userId }, { onConflict: "request_id,user_id" })
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase
    .from("product_request_votes")
    .delete()
    .eq("request_id", requestId)
    .eq("user_id", viewer.userId)

  if (error) throw new Error(error.message)
}

export async function toggleProductRequestFollow(
  supabase: SupabaseClient,
  viewer: ViewerContext,
  requestId: string,
  shouldFollow: boolean
) {
  if (shouldFollow) {
    const { error } = await supabase
      .from("product_request_follows")
      .upsert({ request_id: requestId, user_id: viewer.userId }, { onConflict: "request_id,user_id" })
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase
    .from("product_request_follows")
    .delete()
    .eq("request_id", requestId)
    .eq("user_id", viewer.userId)

  if (error) throw new Error(error.message)
}

export async function addProductRequestComment(
  supabase: SupabaseClient,
  viewer: ViewerContext,
  requestId: string,
  body: string
) {
  const { data, error } = await supabase
    .from("product_request_comments")
    .insert({
      request_id: requestId,
      user_id: viewer.userId,
      role: viewer.role,
      body: body.trim(),
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to add comment")
  }

  return data as ProductRequestComment
}

export async function grantContributorReward(
  supabase: SupabaseClient,
  viewer: ViewerContext,
  requestId: string,
  input: RewardInput
) {
  if (!viewer.isInternalAdmin) {
    throw new Error("Only internal admins can grant rewards")
  }

  const { data, error } = await supabase
    .from("contributor_rewards")
    .insert({
      request_id: requestId,
      user_id: input.user_id,
      reward_type: input.reward_type,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      reward_value: input.reward_value?.trim() || null,
      granted_by_user_id: viewer.userId,
      expires_at: input.expires_at ?? null,
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to grant reward")
  }

  await supabase
    .from("product_requests")
    .update({
      reward_state: "granted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)

  return data as ContributorReward
}
