import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

loadLocalEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const promptsDir = path.join(rootDir, "prompts", "chameleon-marketing");

const baseUrl = (
  process.env.CHAMELEON_MEMORY_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://127.0.0.1:3000"
).replace(/\/+$/, "");
const apiKey = process.env.CHAMELEON_MCP_API_KEY || "";
const agentId = (process.env.CHAMELEON_AGENT_ID || "MARKETING").toUpperCase();
const discoveryModelDefault = "gpt-5-nano";
const draftingModelDefault = "gpt-5-mini";
const revisionModelDefault = "gpt-5-mini";
const maxDraftVariantsDefault = 1;
const maxOutputTokensDefault = Number(process.env.CHAMELEON_MAX_OUTPUT_TOKENS || 150);
const runnerIntervalMs = Number(process.env.CHAMELEON_RUNNER_INTERVAL_MS || 45000);
const autoScanEnabled = (process.env.CHAMELEON_REDDIT_AUTOSCAN || "true").toLowerCase() !== "false";
const autoScanEveryMinutes = Number(process.env.CHAMELEON_REDDIT_AUTOSCAN_MINUTES || 45);
const defaultSearchTerms = splitCsv(
  process.env.CHAMELEON_REDDIT_SEARCH_TERMS ||
    "google sheets coach,google sheets fitness coach,spreadsheet personal trainer,spreadsheet coaching business,client onboarding spreadsheet coach,coach using google sheets,fitness coach spreadsheet,personal trainer google sheets"
);
const defaultSubreddits = splitCsv(
  process.env.CHAMELEON_REDDIT_SUBREDDITS ||
    "smallbusiness,entrepreneur,personaltraining,fitnessbusiness,marketing,sales,onlinecoaching"
);

const RUNNER_KEY = "runner_marketing";
const TOKEN_USAGE_KEY = "usage_marketing_tokens";
const MAX_RECENT_ACTIONS = 20;
const REDDIT_USER_AGENT = "G-Fitness-Chameleon-Marketing/1.0";
const priorityRank = { high: 0, normal: 1, low: 2 };
const isDirectRun = Boolean(process.argv[1]) && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) continue;

    const key = line.slice(0, equalsIndex).trim();
    if (!key || process.env[key]) continue;

    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

let stableRulesCache = null;
let shuttingDown = false;

if (isDirectRun) {
  process.on("SIGINT", async () => {
    shuttingDown = true;
    await patchRunnerState({
      status: "offline",
      current_task_key: null,
      recent_actions: appendAction([], "Runner stopped by SIGINT."),
    }).catch(() => {});
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    shuttingDown = true;
    await patchRunnerState({
      status: "offline",
      current_task_key: null,
      recent_actions: appendAction([], "Runner stopped by SIGTERM."),
    }).catch(() => {});
    process.exit(0);
  });

  main().catch(async (error) => {
    console.error(error);
    await patchRunnerState({
      status: "error",
      current_task_key: null,
      last_error: error instanceof Error ? error.message : "Unknown runner error",
      last_startup_status: "failed",
      last_startup_message: error instanceof Error ? error.message : "Unknown runner error",
      recent_actions: appendAction([], "Runner crashed during startup."),
    }).catch(() => {});
    process.exit(1);
  });
}

function assertRunnerConfig() {
  if (!apiKey) {
    throw new Error("CHAMELEON_MCP_API_KEY is required");
  }
}

export async function runSingleMarketingCycle() {
  assertRunnerConfig();

  const startupAttemptAt = nowIso();
  const startupDiagnostics = await runStartupDiagnostics();
  const runnerSettings = await getRunnerSettings();

  await patchRunnerState({
    agent: agentId,
    status: startupDiagnostics.startup_ready ? "starting" : "blocked",
    current_task_key: null,
    last_error: startupDiagnostics.startup_ready ? null : startupDiagnostics.startup_message,
    last_startup_attempt_at: startupAttemptAt,
    last_startup_status: startupDiagnostics.startup_ready ? "ok" : "blocked",
    last_startup_message: startupDiagnostics.startup_message,
    model_preferences: runnerSettings.model_preferences,
    output_limits: runnerSettings.output_limits,
    diagnostics: startupDiagnostics,
    recent_actions: appendAction([], "Runner cycle started."),
  });

  if (!startupDiagnostics.startup_ready) {
    await addRunnerAction(`Startup diagnostics blocked execution: ${startupDiagnostics.startup_message}`);
    return {
      ok: false,
      status: "blocked",
      message: startupDiagnostics.startup_message,
    };
  }

  await runOnce();
  const runner = await memoryRead("state", RUNNER_KEY, true);

  return {
    ok: true,
    status: runner?.data?.status || "idle",
    current_task_key: runner?.data?.current_task_key || null,
  };
}

async function main() {
  assertRunnerConfig();
  await runSingleMarketingCycle();

  while (!shuttingDown) {
    try {
      const cycleDiagnostics = await runStartupDiagnostics();
      const currentRunnerSettings = await getRunnerSettings();
      await patchRunnerState({
        diagnostics: cycleDiagnostics,
        last_startup_status: cycleDiagnostics.startup_ready ? "ok" : "blocked",
        last_startup_message: cycleDiagnostics.startup_message,
        model_preferences: currentRunnerSettings.model_preferences,
        output_limits: currentRunnerSettings.output_limits,
      });

      if (!cycleDiagnostics.startup_ready) {
        await addRunnerAction(`Startup diagnostics blocked execution: ${cycleDiagnostics.startup_message}`);
        await sleep(runnerIntervalMs);
        continue;
      }

      await runOnce();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown runner error";
      console.error("[runner]", message);
      await patchRunnerState({
        status: "error",
        current_task_key: null,
        last_error: message,
      });
      await addRunnerAction(`Runner error: ${message}`);
      await emitRunnerLog("HUMAN_NEEDED", `Marketing runner error: ${message}`, "high").catch(() => {});
    }

    await sleep(runnerIntervalMs);
  }
}

async function runOnce() {
  await acknowledgeRunnerControls();
  await ensureAutoScanTask();
  await syncSentDraftFollowUps();

  const task = await claimNextTask();

  if (!task) {
    await patchRunnerState({
      status: "idle",
      current_task_key: null,
      last_error: null,
    });
    return;
  }

  await patchRunnerState({
    status: "running",
    current_task_key: task.key,
    last_error: null,
  });
  await addRunnerAction(`Claimed task ${task.key} (${task.data.task_type}).`);

  try {
    switch (task.data.task_type) {
      case "scan_reddit_leads":
        await processRedditScan(task);
        break;
      case "lead_summary":
        await processLeadSummary(task);
        break;
      case "draft_reddit_outreach":
      case "draft_dm_reply":
      case "draft_follow_up":
      case "draft_social_post":
      case "revise_marketing_copy":
        await processDraftTask(task);
        break;
      default:
        throw new Error(`Unsupported task type '${task.data.task_type}'`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown task failure";
    await failTask(task.key, message, task.data.owner_user_id || null);
  await patchRunnerState({
    status: "error",
    current_task_key: null,
    last_error: message,
  });
  await addRunnerAction(`Task ${task.key} failed: ${message}`);
  await emitRunnerLog("HUMAN_NEEDED", `Task ${task.key} failed: ${message}`, "high", task.key).catch(() => {});
  return;
}

  await patchRunnerState({
    status: "idle",
    current_task_key: null,
    last_error: null,
  });
}

async function acknowledgeRunnerControls() {
  const runner = await memoryRead("state", RUNNER_KEY, true);
  if (!runner?.data) {
    return;
  }

  const controlRequestedAt = runner.data.control_requested_at || null;
  const lastAcknowledgedAt = runner.data.last_control_acknowledged_at || null;

  if (!controlRequestedAt || controlRequestedAt === lastAcknowledgedAt) {
    return;
  }

  const action = runner.data.last_control_action || "unknown";
  await patchRunnerState({
    last_control_acknowledged_at: controlRequestedAt,
  });
  await addRunnerAction(`Dashboard control received: ${action}.`);
  await emitRunnerLog("DIRECTIVE", `Dashboard control acknowledged: ${action}.`, "normal", RUNNER_KEY).catch(() => {});
}

async function processRedditScan(task) {
  const ownerUserId = task.data.owner_user_id || null;
  const runnerSettings = await getRunnerSettings(ownerUserId);
  const taskPayload = asRecord(task.data.task_payload);
  const subreddits = normalizeStringList(taskPayload.subreddits, runnerSettings.reddit.subreddits);
  const searchTerms = normalizeStringList(taskPayload.search_terms, runnerSettings.reddit.search_terms);
  const maxResultsPerSearch = Number(taskPayload.max_results_per_search || 12);
  const minScore = Number(taskPayload.min_score || 6);

  const candidates = await fetchRedditCandidates({
    subreddits,
    searchTerms,
    maxResultsPerSearch,
  });

  const leads = await loadSectorEntries("leads", ownerUserId);
  const conversations = await loadSectorEntries("conversations", ownerUserId);
  const tasks = await loadTaskEntries(ownerUserId);
  const drafts = await loadDraftEntries(ownerUserId);

  let savedCount = 0;
  let queuedCount = 0;
  let refreshedCount = 0;

  for (const candidate of candidates) {
    const scored = scoreRedditCandidate(candidate);
    if (scored.score < minScore) {
      continue;
    }

    const existingLead = findLeadForCandidate(leads, candidate);
    const leadKey = existingLead?.key || makeKey("lead_");
    const existingNotes = typeof existingLead?.data?.notes === "string" ? existingLead.data.notes : "";
    const mergedNotes = mergeNotes(existingNotes, buildLeadNote(candidate, scored));
    const nextFollowUpAt = daysFromNowIso(2);

    const leadPayload = {
      owner_user_id: existingLead?.data?.owner_user_id || `runner:${agentId}`,
      full_name: candidate.author,
      platform: "reddit",
      handle: candidate.author,
      source: `reddit/${candidate.subreddit}`,
      stage: existingLead?.data?.stage || "new",
      temperature: scored.score >= 9 ? "hot" : scored.score >= 7 ? "warm" : "cold",
      notes: mergedNotes,
      last_contacted_at: existingLead?.data?.last_contacted_at || null,
      next_follow_up_at: existingLead?.data?.next_follow_up_at || nextFollowUpAt,
      status: existingLead?.data?.status || "active",
      fit_score: scored.score,
      ai_summary: scored.summary,
      discovery_reason: scored.reason,
      source_post_id: candidate.id,
      source_permalink: candidate.permalink,
      source_title: candidate.title,
      source_excerpt: candidate.excerpt,
      discovered_at: existingLead?.data?.discovered_at || nowIso(),
      updated_at: nowIso(),
      created_at: existingLead?.data?.created_at || nowIso(),
    };

    if (existingLead) {
      await memoryUpdate("leads", leadKey, leadPayload, ownerUserId);
      refreshedCount += 1;
    } else {
      await memoryWrite("leads", leadKey, leadPayload, ownerUserId);
      leads.push({ key: leadKey, data: leadPayload, created_at: leadPayload.created_at, updated_at: leadPayload.updated_at });
      savedCount += 1;
    }

    const conversationKey = buildConversationKey(candidate);
    if (!conversations.some((entry) => entry.key === conversationKey)) {
      const conversationPayload = {
        lead_key: leadKey,
        platform: "reddit",
        subreddit: candidate.subreddit,
        author: candidate.author,
        post_id: candidate.id,
        permalink: candidate.permalink,
        title: candidate.title,
        excerpt: candidate.excerpt,
        status: "discovered",
        outreach_status: "pending",
        fit_score: scored.score,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      await memoryWrite("conversations", conversationKey, conversationPayload, ownerUserId);
      conversations.push({ key: conversationKey, data: conversationPayload, created_at: conversationPayload.created_at, updated_at: conversationPayload.updated_at });
    }

    const hasPendingSummaryTask = tasks.some((entry) =>
      entry.data.lead_key === leadKey &&
      entry.data.task_type === "lead_summary" &&
      ["queued", "claimed", "revision_requested"].includes(entry.data.status)
    );
    const hasPendingOutreachTask = tasks.some((entry) =>
      entry.data.lead_key === leadKey &&
      entry.data.task_type === "draft_reddit_outreach" &&
      ["queued", "claimed", "revision_requested"].includes(entry.data.status)
    );
    const hasOpenOutreachDraft = drafts.some((entry) =>
      entry.data.lead_key === leadKey &&
      entry.data.draft_type === "reddit_outreach" &&
      entry.data.status !== "sent"
    );

    if (!hasPendingSummaryTask) {
      const summaryTaskKey = await createTask({
        owner_user_id: ownerUserId,
        lead_key: leadKey,
        task_type: "lead_summary",
        status: "queued",
        priority: "normal",
        channel: "reddit_dm",
        objective: "Summarize the Reddit lead and recommend the next step.",
        campaign_profile: "reddit_google_sheets",
        required_output_format: "Summary, pain points, fit score, recommended next action",
        constraints: [
          "Focus on whether the lead looks like a coach or trainer.",
          "Call out spreadsheet or Google Sheets signals explicitly.",
        ],
        banned_claims: [],
        task_payload: {
          conversation_key: conversationKey,
        },
      }, ownerUserId);
      tasks.push({ key: summaryTaskKey, data: { lead_key: leadKey, task_type: "lead_summary", status: "queued" } });
      queuedCount += 1;
    }

    if (!hasPendingOutreachTask && !hasOpenOutreachDraft) {
      const outreachTaskKey = await createTask({
        owner_user_id: ownerUserId,
        lead_key: leadKey,
        task_type: "draft_reddit_outreach",
        status: "queued",
        priority: scored.score >= 8 ? "high" : "normal",
        channel: "reddit_dm",
        objective: "Draft a natural Reddit outreach message for a coach using spreadsheets or Google Sheets.",
        campaign_profile: "reddit_google_sheets",
        required_output_format: "2-3 concise Reddit-friendly outreach variants plus rationale",
        constraints: [
          "Keep it low pressure and human.",
          "Reference the workflow pain naturally.",
          "Do not oversell or make claims you cannot support.",
        ],
        banned_claims: [
          "No revenue promises.",
          "No medical or health promises.",
        ],
        task_payload: {
          conversation_key: conversationKey,
          source_post_id: candidate.id,
        },
      }, ownerUserId);
      tasks.push({ key: outreachTaskKey, data: { lead_key: leadKey, task_type: "draft_reddit_outreach", status: "queued" } });
      queuedCount += 1;
    }
  }

  await completeTask(task.key, "completed", {
    result_summary: `Scanned Reddit: ${savedCount} new leads, ${refreshedCount} refreshed, ${queuedCount} follow-on tasks queued.`,
    result_counts: {
      candidates_seen: candidates.length,
      leads_saved: savedCount,
      leads_refreshed: refreshedCount,
      follow_on_tasks: queuedCount,
    },
  }, ownerUserId);

  await addRunnerAction(`Reddit scan finished: ${savedCount} new leads, ${queuedCount} tasks queued.`);
  await emitRunnerLog("GENERAL", `Reddit scan finished. New leads: ${savedCount}. Refreshed leads: ${refreshedCount}. Follow-on tasks queued: ${queuedCount}.`, "normal", task.key).catch(() => {});
}

async function processLeadSummary(task) {
  const ownerUserId = task.data.owner_user_id || null;
  const runnerSettings = await getRunnerSettings(ownerUserId);
  if (!task.data.lead_key) {
    throw new Error("Lead summary task is missing lead_key");
  }

  const lead = await memoryRead("leads", task.data.lead_key, false, ownerUserId);
  if (!lead) {
    throw new Error(`Lead '${task.data.lead_key}' not found`);
  }

  const conversations = (await loadSectorEntries("conversations", ownerUserId))
    .filter((entry) => entry.data.lead_key === task.data.lead_key)
    .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")))
    .slice(0, 3);

  const output = await generateStructuredOutput({
    taskType: task.data.task_type,
    runnerSettings,
    openAiApiKey: runnerSettings.openai_api_key,
    ownerUserId,
    recipe: "lead-summary.md",
    context: {
      task,
      lead: lead.data,
      conversations: conversations.map((entry) => entry.data),
    },
    fallback: () => buildFallbackLeadSummary(lead.data, conversations.map((entry) => entry.data)),
  });

  const strategyKey = `lead_summary_${task.data.lead_key}`;
  await memoryWrite("strategy", strategyKey, {
    lead_key: task.data.lead_key,
    summary: output.summary,
    pain_points: output.pain_points || [],
    fit_score: output.fit_score ?? lead.data.fit_score ?? 0,
    recommended_next_action: output.recommended_next_action || "Review manually",
    created_at: nowIso(),
    updated_at: nowIso(),
  }, ownerUserId);

  await memoryUpdate("leads", task.data.lead_key, {
    ai_summary: output.summary,
    fit_score: output.fit_score ?? lead.data.fit_score ?? 0,
    updated_at: nowIso(),
  }, ownerUserId);

  await completeTask(task.key, "completed", {
    result_summary: output.summary,
    completed_at: nowIso(),
  }, ownerUserId);

  await addRunnerAction(`Lead summary written for ${task.data.lead_key}.`);
}

async function processDraftTask(task) {
  const ownerUserId = task.data.owner_user_id || null;
  const runnerSettings = await getRunnerSettings(ownerUserId);
  const lead = task.data.lead_key ? await memoryRead("leads", task.data.lead_key, false, ownerUserId) : null;
  const conversations = task.data.lead_key
    ? (await loadSectorEntries("conversations", ownerUserId))
        .filter((entry) => entry.data.lead_key === task.data.lead_key)
        .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")))
    : [];
  const sourceDraftKey = task.data.source_draft_key || task.data.task_payload?.source_draft_key || null;
  const sourceDraft = sourceDraftKey ? await memoryRead("content", sourceDraftKey, false, ownerUserId) : null;
  const strategyEntry = task.data.lead_key ? await memoryRead("strategy", `lead_summary_${task.data.lead_key}`, true, ownerUserId) : null;

  const recipe = resolveDraftRecipe(task.data.task_type);
  const output = await generateStructuredOutput({
    taskType: task.data.task_type,
    runnerSettings,
    openAiApiKey: runnerSettings.openai_api_key,
    ownerUserId,
    recipe,
    context: {
      task,
      lead: lead?.data || null,
      strategy: strategyEntry?.data || null,
      conversations: conversations.map((entry) => entry.data).slice(0, 3),
      source_draft: sourceDraft?.data || null,
    },
    fallback: () => buildFallbackDraftOutput(task, lead?.data || null, conversations.map((entry) => entry.data), sourceDraft?.data || null),
  });

  const variants = Array.isArray(output.variants)
    ? output.variants.slice(0, clampNumber(runnerSettings.output_limits.max_draft_variants, 1, 3, 2))
    : [];
  if (variants.length === 0) {
    throw new Error("Draft task did not return any variants");
  }

  const draftKeys = [];
  for (const [index, variant] of variants.entries()) {
    const draftKey = makeKey("draft_");
    draftKeys.push(draftKey);
    const variantLabel = typeof variant.label === "string" && variant.label.trim() ? variant.label.trim() : String.fromCharCode(65 + index);
    await memoryWrite("content", draftKey, {
      owner_user_id: ownerUserId,
      task_key: task.key,
      lead_key: task.data.lead_key || null,
      channel: task.data.channel || "reddit_dm",
      draft_type: mapDraftType(task.data.task_type),
      content: variant.content || "",
      variant_label: variantLabel,
      status: "drafted",
      campaign_profile: task.data.campaign_profile || "default",
      objective: task.data.objective || "",
      rationale: variant.rationale || "",
      source_draft_key: sourceDraftKey,
      created_at: nowIso(),
      updated_at: nowIso(),
    }, ownerUserId);
  }

  if (task.data.lead_key) {
    await memoryUpdate("leads", task.data.lead_key, {
      stage: task.data.task_type === "draft_follow_up" ? "conversation" : lead?.data?.stage || "new",
      updated_at: nowIso(),
    }, ownerUserId).catch(() => {});
  }

  const conversationKey = task.data.task_payload?.conversation_key;
  if (conversationKey) {
    await memoryUpdate("conversations", conversationKey, {
      outreach_status: task.data.task_type === "draft_follow_up" ? "follow_up_drafted" : "drafted",
      latest_task_key: task.key,
      latest_draft_keys: draftKeys,
      updated_at: nowIso(),
    }, ownerUserId).catch(() => {});
  }

  await completeTask(task.key, "drafted", {
    draft_keys: draftKeys,
    result_summary: `Generated ${draftKeys.length} draft variant(s).`,
  }, ownerUserId);

  await addRunnerAction(`Drafted ${draftKeys.length} variant(s) for task ${task.key}.`);
  await emitRunnerLog("GENERAL", `Drafts generated for ${task.key}: ${draftKeys.join(", ")}`, "normal", task.key).catch(() => {});
}

async function syncSentDraftFollowUps() {
  const drafts = await loadDraftEntries();

  for (const draft of drafts.filter((entry) => entry.data.status === "sent")) {
    const ownerUserId = draft.owner_user_id || draft.data.owner_user_id || null;
    const followUps = await loadSectorEntries("follow_ups", ownerUserId);
    const tasks = await loadTaskEntries(ownerUserId);
    const conversations = await loadSectorEntries("conversations", ownerUserId);
    if (!draft.data.lead_key) {
      continue;
    }

    const followUpKey = `follow_up_${draft.key}`;
    const existingFollowUp = followUps.find((entry) => entry.key === followUpKey);
    const dueAt = existingFollowUp?.data?.due_at || daysFromNowIso(3);

    if (!existingFollowUp) {
      await memoryWrite("follow_ups", followUpKey, {
        owner_user_id: ownerUserId,
        lead_key: draft.data.lead_key,
        source_draft_key: draft.key,
        status: "scheduled",
        due_at: dueAt,
        created_at: nowIso(),
        updated_at: nowIso(),
      }, ownerUserId);
      await addRunnerAction(`Scheduled follow-up for ${draft.data.lead_key} from ${draft.key}.`);
    }

    const dueNow = new Date(dueAt).getTime() <= Date.now();
    const hasQueuedFollowUp = tasks.some((task) =>
      task.data.lead_key === draft.data.lead_key &&
      task.data.task_type === "draft_follow_up" &&
      ["queued", "claimed", "revision_requested", "drafted"].includes(task.data.status)
    );

    if (dueNow && !hasQueuedFollowUp) {
      const relatedConversation = conversations.find((entry) => entry.data.lead_key === draft.data.lead_key);
      const followUpTaskKey = await createTask({
        owner_user_id: ownerUserId,
        lead_key: draft.data.lead_key,
        task_type: "draft_follow_up",
        status: "queued",
        priority: "normal",
        channel: draft.data.channel || "reddit_dm",
        objective: "Draft a gentle follow-up for a previously contacted Reddit lead.",
        campaign_profile: draft.data.campaign_profile || "default",
        required_output_format: "2-3 concise follow-up variants plus rationale",
        constraints: [
          "Assume the first message was already sent manually.",
          "Keep it helpful and low pressure.",
        ],
        banned_claims: [
          "No revenue promises.",
          "No medical or health promises.",
        ],
        task_payload: {
          conversation_key: relatedConversation?.key || null,
          source_draft_key: draft.key,
          follow_up_key: followUpKey,
        },
      }, ownerUserId);
      tasks.push({ key: followUpTaskKey, data: { lead_key: draft.data.lead_key, task_type: "draft_follow_up", status: "queued" } });
      await memoryUpdate("follow_ups", followUpKey, {
        status: "queued",
        queued_task_at: nowIso(),
        updated_at: nowIso(),
      }, ownerUserId).catch(() => {});
      await addRunnerAction(`Queued follow-up task for ${draft.data.lead_key}.`);
    }
  }
}

async function ensureAutoScanTask() {
  const { coaches } = await listMarketingCoaches();

  for (const coach of coaches.filter((entry) => entry.autoscan_enabled !== false)) {
    const ownerUserId = coach.user_id;
    const settings = await getRunnerSettings(ownerUserId);
    if (!settings.autoscan_enabled) {
      continue;
    }

    const autoScanStateKey = `runner_autoscan_${ownerUserId}`;
    const autoScanState = await memoryRead("state", autoScanStateKey, true, ownerUserId);
    const lastAutoScanAt = autoScanState?.data?.last_auto_scan_at || null;
    const due =
      !lastAutoScanAt ||
      Date.now() - new Date(lastAutoScanAt).getTime() >= autoScanEveryMinutes * 60 * 1000;

    if (!due) {
      continue;
    }

    const tasks = await loadTaskEntries(ownerUserId);
    const hasOpenScanTask = tasks.some(
      (entry) =>
        entry.data.task_type === "scan_reddit_leads" &&
        ["queued", "claimed", "revision_requested"].includes(entry.data.status)
    );

    if (hasOpenScanTask) {
      continue;
    }

    await createTask({
      owner_user_id: ownerUserId,
      lead_key: null,
      task_type: "scan_reddit_leads",
      status: "queued",
      priority: "normal",
      channel: "reddit_search",
      objective: "Scan Reddit for coaches using Google Sheets or spreadsheets to manage client operations.",
      campaign_profile: "reddit_google_sheets",
      required_output_format: "Create qualified leads, conversation records, and outreach tasks for the best matches.",
      constraints: [
        "Focus on coaches, personal trainers, online coaches, and fitness operators.",
        "Prioritize Google Sheets, spreadsheet, onboarding, check-ins, admin, and billing signals.",
        "Do not create duplicate leads for the same Reddit handle.",
      ],
      banned_claims: [
        "No revenue promises.",
        "No medical or health promises.",
      ],
      task_payload: {
        subreddits: settings.reddit.subreddits,
        search_terms: settings.reddit.search_terms,
        source: "runner_autoscan",
      },
    }, ownerUserId);

    await memoryWrite("state", autoScanStateKey, {
      owner_user_id: ownerUserId,
      last_auto_scan_at: nowIso(),
      updated_at: nowIso(),
    }, ownerUserId);
    await addRunnerAction(`Queued automatic Reddit scan task for ${ownerUserId}.`);
  }
}

async function claimNextTask() {
  const tasks = await loadTaskEntries();
  const claimable = tasks
    .filter((entry) => entry.owner_user_id && ["queued", "revision_requested"].includes(entry.data.status))
    .sort((a, b) => {
      const priorityDelta = (priorityRank[a.data.priority] ?? 1) - (priorityRank[b.data.priority] ?? 1);
      if (priorityDelta !== 0) return priorityDelta;
      return String(a.data.created_at || "").localeCompare(String(b.data.created_at || ""));
    });

  const nextTask = claimable[0];
  if (!nextTask) {
    return null;
  }

  const ownerUserId = nextTask.owner_user_id || nextTask.data.owner_user_id || null;
  await memoryUpdate("state", nextTask.key, {
    status: "claimed",
    claimed_at: nowIso(),
    claimed_by: agentId,
    updated_at: nowIso(),
    error_message: null,
  }, ownerUserId);

  return await memoryRead("state", nextTask.key, false, ownerUserId);
}

async function completeTask(taskKey, status, patch = {}, ownerUserId = null) {
  await memoryUpdate("state", taskKey, {
    status,
    completed_at: nowIso(),
    updated_at: nowIso(),
    error_message: null,
    ...patch,
  }, ownerUserId);
}

async function failTask(taskKey, errorMessage, ownerUserId = null) {
  await memoryUpdate("state", taskKey, {
    status: "failed",
    completed_at: nowIso(),
    updated_at: nowIso(),
    error_message: errorMessage,
  }, ownerUserId);
}

async function createTask(taskPayload, ownerUserId = null) {
  const key = makeKey("task_");
  await memoryWrite("state", key, {
    owner_user_id: ownerUserId,
    created_at: nowIso(),
    updated_at: nowIso(),
    ...taskPayload,
  }, ownerUserId);
  await sendBoardMessage({
    owner_user_id: ownerUserId,
    tag: "TASK_QUEUED",
    content: taskPayload.lead_key
      ? `Runner queued ${taskPayload.task_type} for ${taskPayload.lead_key}`
      : `Runner queued standalone task ${taskPayload.task_type}`,
    ref_id: key,
  }).catch(() => {});
  return key;
}

async function fetchRedditCandidates({ subreddits, searchTerms, maxResultsPerSearch }) {
  const map = new Map();

  for (const subreddit of subreddits) {
    for (const term of searchTerms) {
      const url = new URL(`https://www.reddit.com/r/${subreddit}/search.json`);
      url.searchParams.set("q", term);
      url.searchParams.set("restrict_sr", "1");
      url.searchParams.set("sort", "new");
      url.searchParams.set("limit", String(maxResultsPerSearch));
      url.searchParams.set("t", "year");

      const response = await fetch(url, {
        headers: {
          "user-agent": REDDIT_USER_AGENT,
          accept: "application/json",
        },
      });

      if (!response.ok) {
        continue;
      }

      const payload = await response.json().catch(() => null);
      const posts = payload?.data?.children || [];
      for (const item of posts) {
        const row = item?.data;
        if (!row?.id || !row?.author || row.author === "[deleted]") {
          continue;
        }
        if (row.over_18) {
          continue;
        }

        const candidate = {
          id: row.id,
          subreddit: row.subreddit || subreddit,
          author: row.author,
          title: cleanText(row.title || ""),
          excerpt: cleanText(row.selftext || ""),
          permalink: row.permalink ? `https://www.reddit.com${row.permalink}` : "",
          created_at: row.created_utc ? new Date(row.created_utc * 1000).toISOString() : nowIso(),
          query: term,
          url: row.url || "",
          score: row.score || 0,
          comments: row.num_comments || 0,
        };
        map.set(candidate.id, candidate);
      }
    }
  }

  return Array.from(map.values());
}

function scoreRedditCandidate(candidate) {
  const haystack = `${candidate.title} ${candidate.excerpt}`.toLowerCase();
  let score = 0;
  const reasons = [];

  const spreadsheetSignals = ["google sheets", "spreadsheet", "google sheet", "sheet", "excel"];
  const coachSignals = ["coach", "coaching", "trainer", "personal trainer", "nutrition coach", "fitness coach", "online coach"];
  const opsSignals = ["client", "clients", "onboarding", "check in", "check-in", "admin", "billing", "payments", "forms", "crm", "tracking", "follow up", "follow-up"];
  const fitnessSignals = ["fitness", "gym", "nutrition", "personal training"];

  if (containsAny(haystack, spreadsheetSignals)) {
    score += 4;
    reasons.push("mentions Google Sheets or spreadsheet workflow");
  }
  if (containsAny(haystack, coachSignals)) {
    score += 3;
    reasons.push("looks like a coach or trainer persona");
  }
  if (containsAny(haystack, opsSignals)) {
    score += 3;
    reasons.push("describes client operations pain");
  }
  if (containsAny(haystack, fitnessSignals)) {
    score += 2;
    reasons.push("contains fitness-adjacent context");
  }
  if (candidate.comments >= 3) {
    score += 1;
  }
  if (candidate.score >= 3) {
    score += 1;
  }

  const negativeSignals = ["job", "hiring", "template request for school", "homework", "dating"];
  if (containsAny(haystack, negativeSignals)) {
    score -= 4;
    reasons.push("contains likely off-target context");
  }

  const summary = [
    candidate.title,
    candidate.excerpt.slice(0, 220),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    score: Math.max(0, Math.min(score, 10)),
    reason: reasons.join("; ") || "general business ops discussion",
    summary,
  };
}

function findLeadForCandidate(leads, candidate) {
  return leads.find((entry) => {
    const platform = String(entry.data.platform || "").toLowerCase();
    const handle = String(entry.data.handle || "").toLowerCase();
    return platform === "reddit" && handle === candidate.author.toLowerCase();
  });
}

function buildConversationKey(candidate) {
  return `reddit_${candidate.author.toLowerCase()}_${candidate.id}`;
}

function buildLeadNote(candidate, scored) {
  return [
    `Reddit lead discovered in r/${candidate.subreddit}.`,
    `Title: ${candidate.title}`,
    candidate.excerpt ? `Excerpt: ${candidate.excerpt.slice(0, 280)}` : "",
    `Why it looks relevant: ${scored.reason}.`,
    candidate.permalink ? `Source: ${candidate.permalink}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function generateStructuredOutput({ taskType, runnerSettings, openAiApiKey, ownerUserId, recipe, context, fallback }) {
  const stableRules = await loadStableRules();
  const recipePrompt = await readPrompt(recipe);

  if (!openAiApiKey) {
    throw new Error("Coach OpenAI API key is missing for this generation task");
  }

  try {
    const model = selectModelForTask(taskType, runnerSettings);
    const maxOutputTokens = clampNumber(
      runnerSettings?.output_limits?.max_output_tokens,
      150,
      1200,
      maxOutputTokensDefault
    );
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model,
        max_output_tokens: maxOutputTokens,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: `${stableRules}\n\n${recipePrompt}` }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: `Context JSON:\n${JSON.stringify(context, null, 2)}` }],
          },
        ],
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error?.message || `OpenAI HTTP ${response.status}`);
    }

    await recordTokenUsage(ownerUserId, payload?.usage, model);

    const rawText = payload?.output_text || extractResponseText(payload);
    if (!rawText) {
      throw new Error("OpenAI response did not contain output_text");
    }

    return parseLooseJson(rawText);
  } catch (error) {
    await addRunnerAction(`AI generation fell back to template output: ${error instanceof Error ? error.message : "unknown error"}`);
    return fallback();
  }
}

function selectModelForTask(taskType, runnerSettings) {
  if (taskType === "scan_reddit_leads" || taskType === "lead_summary") {
    return runnerSettings?.model_preferences?.discovery || discoveryModelDefault;
  }

  if (taskType === "revise_marketing_copy") {
    return runnerSettings?.model_preferences?.revision || revisionModelDefault;
  }

  return runnerSettings?.model_preferences?.drafting || draftingModelDefault;
}

async function getRunnerSettings(ownerUserId = null) {
  if (!ownerUserId) {
    return {
      model_preferences: {
        discovery: draftingModelDefault,
        drafting: draftingModelDefault,
        revision: draftingModelDefault,
      },
      output_limits: {
        max_draft_variants: clampNumber(maxDraftVariantsDefault, 1, 3, maxDraftVariantsDefault),
        max_output_tokens: clampNumber(maxOutputTokensDefault, 150, 1200, maxOutputTokensDefault),
      },
      reddit: {
        subreddits: defaultSubreddits,
        search_terms: defaultSearchTerms,
      },
      autoscan_enabled: autoScanEnabled,
      openai_api_key: null,
    };
  }

  const payload = await getCoachMarketingSettings(ownerUserId);
  const settings = payload?.settings || {};

  return {
    model_preferences: {
      discovery: draftingModelDefault,
      drafting: draftingModelDefault,
      revision: draftingModelDefault,
    },
    output_limits: {
      max_draft_variants: maxDraftVariantsDefault,
      max_output_tokens: clampNumber(settings?.output_limits?.max_output_tokens, 150, 1200, maxOutputTokensDefault),
    },
    reddit: {
      subreddits: normalizeStringList(settings?.reddit?.subreddits, defaultSubreddits),
      search_terms: normalizeStringList(settings?.reddit?.search_terms, defaultSearchTerms),
    },
    autoscan_enabled: settings?.autoscan_enabled ?? autoScanEnabled,
    openai_api_key: payload?.openai_api_key || null,
  };
}

async function recordTokenUsage(ownerUserId, usage, model) {
  if (!ownerUserId || !usage) {
    return;
  }

  const inputTokens = clampNumber(usage?.input_tokens, 0, Number.MAX_SAFE_INTEGER, 0);
  const outputTokens = clampNumber(usage?.output_tokens, 0, Number.MAX_SAFE_INTEGER, 0);
  const totalTokens = clampNumber(
    usage?.total_tokens,
    0,
    Number.MAX_SAFE_INTEGER,
    inputTokens + outputTokens
  );

  const existing = await memoryRead("state", TOKEN_USAGE_KEY, true, ownerUserId);
  const current = existing?.data || {};
  const payload = {
    model: model || draftingModelDefault,
    requests: clampNumber(current.requests, 0, Number.MAX_SAFE_INTEGER, 0) + 1,
    input_tokens: clampNumber(current.input_tokens, 0, Number.MAX_SAFE_INTEGER, 0) + inputTokens,
    output_tokens: clampNumber(current.output_tokens, 0, Number.MAX_SAFE_INTEGER, 0) + outputTokens,
    total_tokens: clampNumber(current.total_tokens, 0, Number.MAX_SAFE_INTEGER, 0) + totalTokens,
    last_used_at: nowIso(),
    updated_at: nowIso(),
    created_at: current.created_at || nowIso(),
  };

  if (existing) {
    await memoryUpdate("state", TOKEN_USAGE_KEY, payload, ownerUserId);
  } else {
    await memoryWrite("state", TOKEN_USAGE_KEY, payload, ownerUserId);
  }
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, numeric));
}

function buildFallbackLeadSummary(lead, conversations) {
  const latestConversation = conversations[0] || null;
  const notes = String(lead.notes || "").toLowerCase();
  const painPoints = [];
  if (notes.includes("google sheets") || notes.includes("spreadsheet")) painPoints.push("running client operations in spreadsheets");
  if (notes.includes("onboarding")) painPoints.push("manual onboarding flow");
  if (notes.includes("check")) painPoints.push("manual client check-ins");
  if (painPoints.length === 0) painPoints.push("fragmented client admin workflow");

  return {
    summary: latestConversation
      ? `${lead.full_name || lead.handle} appears to be a Reddit lead from r/${latestConversation.subreddit || "unknown"} discussing manual coaching operations. They show signs of using spreadsheets or manual systems to manage clients and may benefit from a cleaner workflow.`
      : `${lead.full_name || lead.handle} appears to be a Reddit lead with signals that they are using manual systems to run coaching operations.`,
    pain_points: painPoints,
    fit_score: Number(lead.fit_score || 6),
    recommended_next_action: "Draft a short, low-pressure Reddit outreach message that references their workflow pain.",
  };
}

function buildFallbackDraftOutput(task, lead, conversations, sourceDraft) {
  const persona = lead?.full_name || lead?.handle || "there";
  const latestConversation = conversations[0] || {};
  const workflowPain = lead?.ai_summary || latestConversation.excerpt || latestConversation.title || "manual spreadsheet-heavy client ops";

  if (task.data.task_type === "draft_follow_up") {
    return {
      variants: [
        {
          label: "A",
          content: `Hey ${persona}, just looping back in case this is still relevant. You mentioned ${trimForSentence(workflowPain)} and I think Chameleon Coach could make that side of the business a lot cleaner. Happy to share what I mean if useful.`,
          rationale: "Gentle nudge with clear relevance.",
        },
        {
          label: "B",
          content: `Quick follow-up, ${persona}. If you're still running client admin through spreadsheets, I can show you how we'd simplify onboarding and day-to-day client management without making things more complicated.`,
          rationale: "Slightly clearer problem/solution framing.",
        },
      ],
    };
  }

  if (task.data.task_type === "revise_marketing_copy" && sourceDraft) {
    const reviewerNote = task.data.requested_revision_note || task.data.task_payload?.requested_revision_note || "Make it feel more natural.";
    return {
      variants: [
        {
          label: "R1",
          content: `Hey ${persona}, saw your post and it felt familiar. A lot of coaches end up stitching client ops together with Google Sheets and manual follow-up, and it gets messy fast. I'm building Chameleon Coach to make that side cleaner. If helpful, I can show you the idea in one message.`,
          rationale: `Revised to address: ${reviewerNote}`,
        },
      ],
    };
  }

  return {
    variants: [
      {
        label: "A",
        content: `Hey ${persona}, saw your post about ${trimForSentence(workflowPain)}. I'm building Chameleon Coach for coaches who are still managing onboarding and client admin through Google Sheets or scattered tools. If it's useful, I can show you what we're doing.`,
        rationale: "Direct and specific to the workflow pain.",
      },
      {
        label: "B",
        content: `Hi ${persona}, your post caught my eye because we keep seeing coaches outgrow spreadsheet-based client ops. Chameleon Coach is aimed at making that whole flow cleaner. Happy to share a quick overview if you'd want to see it.`,
        rationale: "Softer founder-style outreach.",
      },
      {
        label: "C",
        content: `Hey ${persona}, not trying to spam you, but your post sounded exactly like the kind of coaching workflow we're building for. If Google Sheets are doing too much of the heavy lifting right now, I can send over a short explanation of how Chameleon Coach approaches it.`,
        rationale: "Acknowledges cold outreach while staying low-pressure.",
      },
    ],
  };
}

function resolveDraftRecipe(taskType) {
  switch (taskType) {
    case "draft_follow_up":
      return "follow-up.md";
    case "revise_marketing_copy":
      return "revise-copy.md";
    case "draft_reddit_outreach":
    case "draft_dm_reply":
    case "draft_social_post":
    default:
      return "reddit-outreach.md";
  }
}

function mapDraftType(taskType) {
  switch (taskType) {
    case "draft_follow_up":
      return "follow_up";
    case "draft_social_post":
      return "social_post";
    case "revise_marketing_copy":
      return "revision";
    case "draft_reddit_outreach":
      return "reddit_outreach";
    default:
      return "reply";
  }
}

async function loadStableRules() {
  if (!stableRulesCache) {
    stableRulesCache = await readPrompt("stable-rules.md");
  }
  return stableRulesCache;
}

async function readPrompt(fileName) {
  return readFile(path.join(promptsDir, fileName), "utf8");
}

async function loadSectorEntries(sector, ownerUserId = null) {
  const listed = await memoryList(sector, ownerUserId);
  const keys = Array.isArray(listed?.keys) ? listed.keys : [];
  if (!Array.isArray(listed?.keys)) {
    await addRunnerAction(`Sector list for ${sector} returned no keys array; treating as empty.`);
  }
  const items = await Promise.all(keys.map((entry) => memoryRead(sector, entry.key, true, ownerUserId)));
  return items.filter(Boolean);
}

async function loadTaskEntries(ownerUserId = null) {
  const entries = await loadSectorEntries("state", ownerUserId);
  return entries.filter((entry) => entry.key.startsWith("task_"));
}

async function loadDraftEntries(ownerUserId = null) {
  const entries = await loadSectorEntries("content", ownerUserId);
  return entries.filter((entry) => entry.key.startsWith("draft_"));
}

async function addRunnerAction(message) {
  const runner = await memoryRead("state", RUNNER_KEY, true);
  const recentActions = appendAction(Array.isArray(runner?.data?.recent_actions) ? runner.data.recent_actions : [], message);
  await patchRunnerState({ recent_actions: recentActions });
}

async function patchRunnerState(patch) {
  const existing = await memoryRead("state", RUNNER_KEY, true);
  const payload = {
    agent: agentId,
    status: existing?.data?.status || "idle",
    current_task_key: existing?.data?.current_task_key || null,
    heartbeat_at: nowIso(),
    last_error: existing?.data?.last_error || null,
    pending_queue_count: existing?.data?.pending_queue_count || 0,
    recent_actions: Array.isArray(existing?.data?.recent_actions) ? existing.data.recent_actions : [],
    ...existing?.data,
    ...patch,
    heartbeat_at: nowIso(),
  };

  payload.recent_actions = Array.isArray(payload.recent_actions) ? payload.recent_actions.slice(-MAX_RECENT_ACTIONS) : [];
  payload.pending_queue_count = await getPendingQueueCount();

  if (existing) {
    await memoryUpdate("state", RUNNER_KEY, payload);
  } else {
    await memoryWrite("state", RUNNER_KEY, payload);
  }
}

async function runStartupDiagnostics() {
  const checkedAt = nowIso();
  const memoryCheck = await checkMemoryApiReachable();
  const startupReady = Boolean(apiKey) && memoryCheck.reachable;

  return {
    config_loaded: true,
    api_key_present: Boolean(apiKey),
    openai_key_present: false,
    memory_base_url: baseUrl,
    memory_api_reachable: memoryCheck.reachable,
    last_reachability_check_at: checkedAt,
    startup_ready: startupReady,
    startup_message: startupReady
      ? "Ready to process queued work."
      : !apiKey
        ? "Missing CHAMELEON_MCP_API_KEY."
        : memoryCheck.message,
  };
}

async function checkMemoryApiReachable() {
  try {
    const response = await fetch(`${baseUrl}/api/chameleon-memory/health`, {
      headers: {
        "x-chameleon-api-key": apiKey,
        "x-agent": agentId,
      },
    });

    if (!response.ok) {
      return {
        reachable: false,
        message: `Memory API returned HTTP ${response.status}.`,
      };
    }

    return {
      reachable: true,
      message: "Memory API reachable.",
    };
  } catch (error) {
    return {
      reachable: false,
      message: error instanceof Error ? `Memory API unreachable: ${error.message}` : "Memory API unreachable.",
    };
  }
}

async function getPendingQueueCount() {
  const tasks = await loadTaskEntries();
  return tasks.filter((entry) => ["queued", "claimed", "revision_requested"].includes(entry.data.status)).length;
}

function appendAction(existing, message) {
  return [...existing, `${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} ${message}`].slice(-MAX_RECENT_ACTIONS);
}

async function memoryList(sector, ownerUserId = null) {
  return apiRequest("GET", `/api/chameleon-memory/memory/${encodeURIComponent(sector)}`, undefined, ownerUserId);
}

async function memoryRead(sector, key, allowMissing = false, ownerUserId = null) {
  try {
    return await apiRequest("GET", `/api/chameleon-memory/memory/${encodeURIComponent(sector)}/${encodeURIComponent(key)}`, undefined, ownerUserId);
  } catch (error) {
    if (allowMissing && /HTTP 404|No entry/i.test(String(error))) {
      return null;
    }
    throw error;
  }
}

async function memoryWrite(sector, key, data, ownerUserId = null) {
  return apiRequest("PUT", `/api/chameleon-memory/memory/${encodeURIComponent(sector)}/${encodeURIComponent(key)}`, { data, owner_user_id: ownerUserId }, ownerUserId);
}

async function memoryUpdate(sector, key, patch, ownerUserId = null) {
  return apiRequest("PATCH", `/api/chameleon-memory/memory/${encodeURIComponent(sector)}/${encodeURIComponent(key)}`, { patch, owner_user_id: ownerUserId }, ownerUserId);
}

async function sendBoardMessage({ owner_user_id = null, tag, content, type = "broadcast", recipients, priority = "normal", ref_id }) {
  return apiRequest("POST", "/api/chameleon-memory/messages/send", {
    owner_user_id,
    sender: agentId,
    tag,
    content,
    type,
    recipients,
    priority,
    ref_id,
  }, owner_user_id);
}

async function emitRunnerLog(tag, content, priority = "normal", ref_id) {
  return sendBoardMessage({
    tag,
    content,
    priority,
    ref_id,
  });
}

async function apiRequest(method, requestPath, body, ownerUserId = null) {
  const response = await fetch(`${baseUrl}${requestPath}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-chameleon-api-key": apiKey,
      "x-agent": agentId,
      ...(ownerUserId ? { "x-owner-user-id": ownerUserId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }

  return payload;
}

async function listMarketingCoaches() {
  return apiRequest("GET", "/api/chameleon-memory/marketing/coaches");
}

async function getCoachMarketingSettings(ownerUserId) {
  return apiRequest("GET", `/api/chameleon-memory/marketing/settings/${encodeURIComponent(ownerUserId)}`);
}

function parseLooseJson(rawText) {
  const trimmed = String(rawText || "").trim();
  const withoutFences = trimmed.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

  try {
    return JSON.parse(withoutFences);
  } catch {}

  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(withoutFences.slice(start, end + 1));
  }

  throw new Error("Could not parse JSON output");
}

function extractResponseText(payload) {
  if (!payload?.output || !Array.isArray(payload.output)) {
    return "";
  }

  return payload.output
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .filter(Boolean)
    .join("\n");
}

function normalizeStringList(value, fallback) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return splitCsv(value);
  }
  return fallback;
}

function splitCsv(value) {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function nowIso() {
  return new Date().toISOString();
}

function daysFromNowIso(days) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

function makeKey(prefix) {
  return `${prefix}${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function containsAny(haystack, needles) {
  return needles.some((needle) => haystack.includes(needle));
}

function trimForSentence(value) {
  return cleanText(value).replace(/[.?!]+$/g, "").slice(0, 120);
}

function mergeNotes(existing, nextChunk) {
  if (!existing) return nextChunk;
  if (existing.includes(nextChunk)) return existing;
  return `${existing}\n\n${nextChunk}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
