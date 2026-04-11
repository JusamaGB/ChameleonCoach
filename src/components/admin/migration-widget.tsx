"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Select } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Bot, Check, ChevronDown, Loader2, Search, Sparkles, Wand2, X } from "lucide-react"
import type { Client } from "@/types"

type MigrationBootstrap = {
  google_connected: boolean
  workspace_status: "healthy" | "missing" | "not_provisioned" | "disconnected" | "unknown"
  missing_artifacts: string[]
  clients: Client[]
  openai_configured: boolean
  managed_workbook_ids: string[]
}

type MigrationWorkbook = {
  id: string
  name: string
  url: string
  modifiedAt: string | null
  mimeType: string
}

type MigrationTabAnalysis = {
  tabName: string
  headers: string[]
  sampleRows: string[][]
  classification: string
  suggestedDestination: string
  confidence: "high" | "medium" | "low"
  notes: string[]
}

type WorkbookAnalysis = {
  workbook: MigrationWorkbook
  tabs: MigrationTabAnalysis[]
  suggestedClientName: string | null
}

type WidgetStage = "setup" | "queue" | "chat"

type MigrationMessage = {
  id: string
  role: "assistant" | "system"
  content: string
}

type MigrationStep = {
  id: string
  label: string
  status: "pending" | "active" | "done"
}

type WorkbookProgressState = {
  status: "ready" | "in_progress" | "completed"
  steps: MigrationStep[]
  messages: MigrationMessage[]
  summary: string[]
}

type WorkbookStatus = "ready" | "needs_client" | "in_progress" | "completed"

export function MigrationWidget() {
  const [open, setOpen] = useState(false)
  const [bootstrap, setBootstrap] = useState<MigrationBootstrap | null>(null)
  const [loadingBootstrap, setLoadingBootstrap] = useState(false)
  const [loadingWorkbooks, setLoadingWorkbooks] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState("")
  const [workbooks, setWorkbooks] = useState<MigrationWorkbook[]>([])
  const [selectedWorkbookIds, setSelectedWorkbookIds] = useState<string[]>([])
  const [analyses, setAnalyses] = useState<WorkbookAnalysis[]>([])
  const [analysisMode, setAnalysisMode] = useState<"heuristic" | "hybrid">("heuristic")
  const [introDismissed, setIntroDismissed] = useState(false)
  const [manualSource, setManualSource] = useState("")
  const [addingManualSource, setAddingManualSource] = useState(false)
  const [showManualImport, setShowManualImport] = useState(false)
  const [sheetSearch, setSheetSearch] = useState("")
  const [stage, setStage] = useState<WidgetStage>("setup")
  const [clientMappings, setClientMappings] = useState<Record<string, string>>({})
  const [activeWorkbookId, setActiveWorkbookId] = useState<string | null>(null)
  const [workbookProgress, setWorkbookProgress] = useState<Record<string, WorkbookProgressState>>({})

  useEffect(() => {
    if (!open || bootstrap) {
      return
    }

    void loadBootstrap()
  }, [open, bootstrap])

  const visibleWorkbooks = useMemo(() => {
    const managedIds = new Set(bootstrap?.managed_workbook_ids ?? [])
    const normalizedSearch = sheetSearch.trim().toLowerCase()

    return workbooks
      .filter((workbook) => !managedIds.has(workbook.id))
      .filter((workbook) => {
        if (!normalizedSearch) {
          return true
        }

        return workbook.name.toLowerCase().includes(normalizedSearch)
      })
  }, [bootstrap, sheetSearch, workbooks])

  const selectedWorkbooks = useMemo(
    () => workbooks.filter((workbook) => selectedWorkbookIds.includes(workbook.id)),
    [selectedWorkbookIds, workbooks]
  )

  const activeAnalysis = useMemo(
    () => analyses.find((analysis) => analysis.workbook.id === activeWorkbookId) ?? null,
    [activeWorkbookId, analyses]
  )

  const activeClient = useMemo(() => {
    if (!bootstrap || !activeWorkbookId) {
      return null
    }

    return bootstrap.clients.find((client) => client.id === clientMappings[activeWorkbookId]) ?? null
  }, [activeWorkbookId, bootstrap, clientMappings])

  useEffect(() => {
    if (!bootstrap || analyses.length === 0) {
      return
    }

    setClientMappings((current) => {
      const next = { ...current }
      let changed = false

      for (const analysis of analyses) {
        if (next[analysis.workbook.id]) {
          continue
        }

        const matchedClient = matchSuggestedClient(bootstrap.clients, analysis.suggestedClientName)
        if (matchedClient) {
          next[analysis.workbook.id] = matchedClient.id
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [analyses, bootstrap])

  useEffect(() => {
    if (stage !== "chat" || !activeAnalysis) {
      return
    }

    const existingProgress = workbookProgress[activeAnalysis.workbook.id]
    if (existingProgress?.status === "completed" || existingProgress?.status === "in_progress") {
      return
    }

    const matchedClientId = clientMappings[activeAnalysis.workbook.id]
    if (!matchedClientId || !bootstrap) {
      return
    }

    const matchedClient = bootstrap.clients.find((client) => client.id === matchedClientId)
    if (!matchedClient) {
      return
    }

    const steps = buildMigrationSteps(activeAnalysis, matchedClient.name)

    setWorkbookProgress((current) => ({
      ...current,
      [activeAnalysis.workbook.id]: {
        status: "in_progress",
        steps,
        messages: [
          {
            id: `${activeAnalysis.workbook.id}-intro`,
            role: "assistant",
            content: buildIntroMessage(activeAnalysis, matchedClient.name),
          },
        ],
        summary: [],
      },
    }))

    const timeouts: ReturnType<typeof setTimeout>[] = []

    steps.forEach((step, index) => {
      const activateDelay = index * 850
      const completeDelay = activateDelay + 550

      timeouts.push(
        setTimeout(() => {
          setWorkbookProgress((current) => {
            const existing = current[activeAnalysis.workbook.id]
            if (!existing) {
              return current
            }

            return {
              ...current,
              [activeAnalysis.workbook.id]: {
                ...existing,
                steps: existing.steps.map((item) =>
                  item.id === step.id ? { ...item, status: "active" as const } : item
                ),
                messages: appendMessage(existing.messages, {
                  id: `${step.id}-active`,
                  role: "system",
                  content: step.label,
                }),
              },
            }
          })
        }, activateDelay)
      )

      timeouts.push(
        setTimeout(() => {
          setWorkbookProgress((current) => {
            const existing = current[activeAnalysis.workbook.id]
            if (!existing) {
              return current
            }

            const updatedSteps: MigrationStep[] = existing.steps.map((item) =>
              item.id === step.id ? { ...item, status: "done" as const } : item
            )
            const isLast = index === steps.length - 1

            return {
              ...current,
              [activeAnalysis.workbook.id]: {
                status: isLast ? "completed" : "in_progress",
                steps: updatedSteps,
                messages: isLast
                  ? appendMessage(existing.messages, {
                      id: `${activeAnalysis.workbook.id}-summary`,
                      role: "assistant",
                      content: buildSummaryMessage(activeAnalysis, matchedClient.name),
                    })
                  : existing.messages,
                summary: isLast ? buildMigrationSummary(activeAnalysis, matchedClient.name) : existing.summary,
              },
            }
          })
        }, completeDelay)
      )
    })

    return () => {
      for (const timeout of timeouts) {
        clearTimeout(timeout)
      }
    }
  }, [activeAnalysis, bootstrap, clientMappings, stage, workbookProgress])

  async function loadBootstrap() {
    setLoadingBootstrap(true)
    setError("")

    try {
      const res = await fetch("/api/migration/bootstrap")
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to load migration setup.")
      }

      setBootstrap(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load migration setup.")
    } finally {
      setLoadingBootstrap(false)
    }
  }

  async function loadWorkbooks() {
    setLoadingWorkbooks(true)
    setError("")

    try {
      const res = await fetch("/api/migration/workbooks")
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to load Google Sheets.")
      }

      setWorkbooks(data.workbooks ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Google Sheets.")
    } finally {
      setLoadingWorkbooks(false)
    }
  }

  async function analyzeSelectedWorkbooks() {
    if (selectedWorkbooks.length === 0) {
      return
    }

    setAnalyzing(true)
    setError("")

    try {
      const res = await fetch("/api/migration/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workbooks: selectedWorkbooks,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze selected workbooks.")
      }

      setAnalyses(data.analyses ?? [])
      setAnalysisMode(data.mode === "hybrid" ? "hybrid" : "heuristic")
      setStage("queue")
      setActiveWorkbookId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze selected workbooks.")
    } finally {
      setAnalyzing(false)
    }
  }

  async function addManualWorkbook() {
    if (!manualSource.trim()) {
      return
    }

    setAddingManualSource(true)
    setError("")

    try {
      const res = await fetch("/api/migration/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: manualSource }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to load that Google Sheet.")
      }

      setWorkbooks((current) => {
        const existing = current.find((workbook) => workbook.id === data.workbook.id)
        if (existing) {
          return current
        }

        return [data.workbook, ...current]
      })
      setSelectedWorkbookIds((current) =>
        current.includes(data.workbook.id) ? current : [...current, data.workbook.id]
      )
      setManualSource("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load that Google Sheet.")
    } finally {
      setAddingManualSource(false)
    }
  }

  function toggleWorkbookSelection(workbookId: string) {
    setSelectedWorkbookIds((current) =>
      current.includes(workbookId)
        ? current.filter((id) => id !== workbookId)
        : [...current, workbookId]
    )
  }

  function removeWorkbookSelection(workbookId: string) {
    setSelectedWorkbookIds((current) => current.filter((id) => id !== workbookId))
  }

  function updateClientMapping(workbookId: string, clientId: string) {
    setClientMappings((current) => ({
      ...current,
      [workbookId]: clientId,
    }))
  }

  function startWorkbookMigration(workbookId: string) {
    setActiveWorkbookId(workbookId)
    setStage("chat")
  }

  function returnToQueue() {
    setStage("queue")
    setActiveWorkbookId(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-3 rounded-full border border-gf-pink/30 bg-gf-surface px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(0,0,0,0.35)] transition-colors hover:border-gf-pink/60"
      >
        <Bot size={18} className="text-gf-pink" />
        Migration AI
        <ChevronDown size={16} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[min(30rem,calc(100vw-2rem))]">
          <Card className="max-h-[78vh] overflow-y-auto border-gf-pink/20 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gf-pink">Migration Assistant</p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {stage === "chat" ? "Migration in progress" : "Bring legacy Google Sheets into Chameleon"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-gf-muted transition-colors hover:bg-gf-surface hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {!introDismissed && (
              <div className="space-y-4">
                <div className="rounded-xl border border-gf-border bg-gf-surface/80 p-4 text-sm text-gf-muted">
                  <p className="text-white">
                    I can inspect your existing Google Sheets, classify each tab, and propose where it should land inside Chameleon.
                  </p>
                  <p className="mt-2">
                    V1 is Google Sheets only. Pick one or more source workbooks first, then I&apos;ll analyse them and help you match each one to the right Chameleon client.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-3"
                    onClick={() => setIntroDismissed(true)}
                  >
                    Start migration setup
                  </Button>
                </div>

                {bootstrap && !loadingBootstrap && (
                  <div className="grid grid-cols-2 gap-3">
                    <StatusPill label="Google" value={bootstrap.google_connected ? "Connected" : "Not connected"} good={bootstrap.google_connected} />
                    <StatusPill
                      label="Workspace"
                      value={bootstrap.workspace_status === "healthy" ? "Ready" : bootstrap.workspace_status}
                      good={bootstrap.workspace_status === "healthy"}
                    />
                  </div>
                )}
              </div>
            )}

            {loadingBootstrap ? (
              <div className="flex items-center gap-3 rounded-xl border border-gf-border bg-gf-surface/70 p-4 text-sm text-gf-muted">
                <Loader2 size={16} className="animate-spin" />
                Checking migration readiness...
              </div>
            ) : null}

            {bootstrap && introDismissed && (
              <div className="space-y-4">
                {!bootstrap.openai_configured && (
                  <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/5 p-3 text-sm text-yellow-200">
                    `OPENAI_API_KEY` is not configured in this environment yet, so analysis is currently running in heuristic mode. The UI and sheet-inspection flow still work.
                  </div>
                )}

                {!bootstrap.google_connected || bootstrap.workspace_status !== "healthy" ? (
                  <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/5 p-4 text-sm text-yellow-200">
                    <p>
                      Migration needs a healthy Google connection and an already-provisioned Chameleon workspace.
                    </p>
                    {bootstrap.missing_artifacts.length > 0 && (
                      <p className="mt-2 text-yellow-100">
                        Missing: {bootstrap.missing_artifacts.join(", ")}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {stage === "setup" && (
                      <>
                        <div className="rounded-xl border border-gf-border bg-gf-surface/70 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">Source Google Sheets</p>
                              <p className="text-xs text-gf-muted">
                                Load and browse your legacy spreadsheets, then multi-select the sources you want to inspect.
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => void loadWorkbooks()}
                              disabled={loadingWorkbooks}
                            >
                              {loadingWorkbooks ? "Loading..." : workbooks.length > 0 ? "Refresh" : "Load Sheets"}
                            </Button>
                          </div>

                          {workbooks.length > 0 ? (
                            <div className="mb-4 rounded-xl border border-gf-border bg-gf-black/20 p-3">
                              <div className="flex items-center gap-2">
                                <Search size={14} className="text-gf-muted" />
                                <input
                                  value={sheetSearch}
                                  onChange={(e) => setSheetSearch(e.target.value)}
                                  placeholder="Search loaded Google Sheets"
                                  className="w-full bg-transparent text-sm text-white placeholder:text-gf-muted/60 focus:outline-none"
                                />
                              </div>
                            </div>
                          ) : null}

                          {visibleWorkbooks.length === 0 && !loadingWorkbooks ? (
                            <p className="text-sm text-gf-muted">
                              {workbooks.length === 0
                                ? "No legacy source sheets loaded yet."
                                : "No loaded sheets match that search."}
                            </p>
                          ) : null}

                          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                            {visibleWorkbooks.map((workbook) => {
                              const selected = selectedWorkbookIds.includes(workbook.id)
                              return (
                                <button
                                  key={workbook.id}
                                  type="button"
                                  onClick={() => toggleWorkbookSelection(workbook.id)}
                                  onDoubleClick={() => removeWorkbookSelection(workbook.id)}
                                  className={`block w-full rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                                    selected
                                      ? "border-gf-pink/40 bg-gf-pink/10"
                                      : "border-gf-border bg-gf-black/30"
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={`mt-1 h-3 w-3 rounded-full border ${selected ? "border-gf-pink bg-gf-pink" : "border-gf-muted"}`} />
                                    <div className="min-w-0">
                                      <p className="truncate font-medium text-white">{workbook.name}</p>
                                      <p className="text-xs text-gf-muted">
                                        {workbook.modifiedAt
                                          ? `Updated ${new Date(workbook.modifiedAt).toLocaleString("en-GB")}`
                                          : "Modified date unavailable"}
                                      </p>
                                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-gf-muted/80">
                                        {describeWorkbookType(workbook.mimeType)}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowManualImport((current) => !current)}
                            className="mt-3 text-xs font-medium text-gf-muted transition-colors hover:text-white"
                          >
                            {showManualImport ? "Hide manual sheet lookup" : "Can't find a sheet? Add one by URL or ID"}
                          </button>

                          {showManualImport && (
                            <div className="mt-3 grid gap-2 rounded-xl border border-gf-border bg-gf-black/20 p-3">
                              <Input
                                label="Google Sheets URL or ID"
                                placeholder="Paste a sheet URL or spreadsheet ID"
                                value={manualSource}
                                onChange={(e) => setManualSource(e.target.value)}
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => void addManualWorkbook()}
                                disabled={addingManualSource || !manualSource.trim()}
                              >
                                {addingManualSource ? "Adding sheet..." : "Add sheet manually"}
                              </Button>
                            </div>
                          )}
                        </div>

                        {selectedWorkbooks.length > 0 && (
                          <div className="rounded-xl border border-gf-pink/20 bg-gf-pink/5 p-3 text-sm text-gf-muted">
                            <p className="text-white">
                              {selectedWorkbooks.length === 1 ? "Selected source" : `Selected sources (${selectedWorkbooks.length})`}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {selectedWorkbooks.map((workbook) => (
                                <button
                                  key={workbook.id}
                                  type="button"
                                  onDoubleClick={() => removeWorkbookSelection(workbook.id)}
                                  className="rounded-full border border-gf-pink/25 bg-gf-pink/10 px-3 py-1 text-xs text-white transition-colors hover:border-gf-pink/50"
                                  title="Double-click to deselect"
                                >
                                  {workbook.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <Button
                          type="button"
                          className="w-full"
                          disabled={selectedWorkbookIds.length === 0 || analyzing}
                          onClick={() => void analyzeSelectedWorkbooks()}
                        >
                          {analyzing
                            ? `Analysing ${selectedWorkbookIds.length} selected ${selectedWorkbookIds.length === 1 ? "sheet" : "sheets"}...`
                            : `Analyse ${selectedWorkbookIds.length || ""} selected ${selectedWorkbookIds.length === 1 ? "sheet" : "sheets"}`.trim()}
                        </Button>
                      </>
                    )}

                    {stage === "queue" && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-gf-muted">
                          <Sparkles size={14} className="text-gf-pink" />
                          Analysis mode: {analysisMode === "hybrid" ? "hybrid" : "heuristic"}
                        </div>

                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-sm text-blue-100">
                          Pick one workbook to migrate next. Once a workbook is matched to a client, you can open its migration thread, review the streamed steps, confirm it, and come back for the next one.
                        </div>

                        {analyses.map((analysis) => {
                          const matchedClientId = clientMappings[analysis.workbook.id] ?? ""
                          const matchedClient = bootstrap.clients.find((client) => client.id === matchedClientId) ?? null
                          const progressState = workbookProgress[analysis.workbook.id]
                          const workbookStatus = getWorkbookStatus(progressState, matchedClientId)

                          return (
                            <div key={analysis.workbook.id} className="rounded-xl border border-gf-border bg-gf-black/30 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-white">{analysis.workbook.name}</p>
                                  <p className="text-xs text-gf-muted">{analysis.tabs.length} tabs inspected</p>
                                  {analysis.suggestedClientName && (
                                    <p className="mt-2 text-sm text-gf-muted">
                                      Suggested client: <span className="text-white">{analysis.suggestedClientName}</span>
                                    </p>
                                  )}
                                </div>
                                <StatusBadge status={workbookStatus} />
                              </div>

                              <div className="mt-4 rounded-xl border border-gf-border bg-gf-surface/40 p-3">
                                <p className="text-xs uppercase tracking-[0.16em] text-gf-muted">Client Mapping</p>
                                {bootstrap.clients.length > 0 ? (
                                  <Select
                                    label="Match to client"
                                    options={bootstrap.clients.map((client) => ({
                                      value: client.id,
                                      label: client.name,
                                    }))}
                                    value={matchedClientId}
                                    onChange={(e) => updateClientMapping(analysis.workbook.id, e.target.value)}
                                  />
                                ) : (
                                  <p className="mt-2 text-sm text-gf-muted">
                                    No target clients yet. Create or invite the client first, then map this workbook into their Chameleon workspace.
                                  </p>
                                )}

                                {matchedClient && (
                                  <p className="mt-2 text-xs text-green-300">
                                    Ready to migrate into {matchedClient.name}&apos;s workspace.
                                  </p>
                                )}
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                {analysis.tabs.map((tab) => (
                                  <div key={tab.tabName} className="rounded-xl border border-gf-border bg-gf-surface/50 p-3">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                      <p className="font-medium text-white">{tab.tabName}</p>
                                      <Badge variant={tab.confidence === "high" ? "success" : tab.confidence === "medium" ? "warning" : "default"}>
                                        {tab.confidence}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gf-muted">{tab.suggestedDestination}</p>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-4 flex items-center justify-between gap-3">
                                <p className="text-xs text-gf-muted">
                                  {progressState?.status === "completed"
                                    ? "Migration confirmed. You can reopen the thread to review the summary."
                                    : matchedClientId
                                      ? "Client matched. Start the migration thread when you’re ready."
                                      : "Choose a client first so this workbook knows where to land."}
                                </p>
                                <Button
                                  type="button"
                                  variant={progressState?.status === "completed" ? "secondary" : "primary"}
                                  disabled={!matchedClientId}
                                  onClick={() => startWorkbookMigration(analysis.workbook.id)}
                                >
                                  {progressState?.status === "completed" ? "Review migration" : "Start migration"}
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {stage === "chat" && activeAnalysis && (
                      <WorkbookChatView
                        analysis={activeAnalysis}
                        client={activeClient}
                        progress={workbookProgress[activeAnalysis.workbook.id]}
                        onBack={returnToQueue}
                      />
                    )}
                  </>
                )}

                {error && <p className="text-sm text-red-400">{error}</p>}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  )
}

function WorkbookChatView({
  analysis,
  client,
  progress,
  onBack,
}: {
  analysis: WorkbookAnalysis
  client: Client | null
  progress: WorkbookProgressState | undefined
  onBack: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" className="px-0 text-gf-muted hover:text-white" onClick={onBack}>
          <ArrowLeft size={16} className="mr-2" />
          Back to workbook queue
        </Button>
        <StatusBadge status={progress?.status === "completed" ? "completed" : "in_progress"} />
      </div>

      <div className="rounded-xl border border-gf-border bg-gf-surface/70 p-4">
        <p className="text-sm font-semibold text-white">{analysis.workbook.name}</p>
        <p className="mt-1 text-xs text-gf-muted">
          Migrating into {client?.name ?? "an unmapped client"}&apos;s Chameleon workspace
        </p>
      </div>

      <div className="space-y-3">
        {(progress?.messages ?? []).map((message) => (
          <div
            key={message.id}
            className={`rounded-2xl border p-4 text-sm ${
              message.role === "assistant"
                ? "border-gf-pink/25 bg-gf-pink/8 text-white"
                : "border-gf-border bg-gf-black/20 text-gf-muted"
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gf-border bg-gf-black/25 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Wand2 size={14} className="text-gf-pink" />
          <p className="text-sm font-semibold text-white">Migration progress</p>
        </div>
        <div className="space-y-2">
          {(progress?.steps ?? []).map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
                step.status === "done"
                  ? "border-green-500/20 bg-green-500/5 text-green-100"
                  : step.status === "active"
                    ? "border-gf-pink/25 bg-gf-pink/8 text-white"
                    : "border-gf-border bg-gf-surface/40 text-gf-muted"
              }`}
            >
              {step.status === "done" ? (
                <Check size={14} className="text-green-300" />
              ) : step.status === "active" ? (
                <Loader2 size={14} className="animate-spin text-gf-pink" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border border-gf-muted/50" />
              )}
              <span>{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gf-border bg-gf-surface/70 p-4">
        <p className="text-sm font-semibold text-white">Detected destination preview</p>
        <div className="mt-3 space-y-3">
          {analysis.tabs.map((tab) => (
            <div key={tab.tabName} className="rounded-xl border border-gf-border bg-gf-black/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-white">{tab.tabName}</p>
                <Badge variant={tab.confidence === "high" ? "success" : tab.confidence === "medium" ? "warning" : "default"}>
                  {tab.confidence}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-gf-muted">
                Destination: <span className="text-white">{tab.suggestedDestination}</span>
              </p>
              {tab.headers.length > 0 && (
                <p className="mt-2 text-xs text-gf-muted">
                  Headers: {tab.headers.join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {progress?.summary?.length ? (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <p className="text-sm font-semibold text-blue-100">Migration summary</p>
          <div className="mt-3 space-y-2">
            {progress.summary.map((line) => (
              <p key={line} className="text-sm text-blue-50">
                {line}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" onClick={onBack} disabled={progress?.status !== "completed"}>
          {progress?.status === "completed" ? "Confirm and return to queue" : "Finish current migration first"}
        </Button>
      </div>
    </div>
  )
}

function getWorkbookStatus(progress: WorkbookProgressState | undefined, matchedClientId: string | undefined): WorkbookStatus {
  if (progress?.status === "completed") {
    return "completed"
  }

  if (progress?.status === "in_progress") {
    return "in_progress"
  }

  if (!matchedClientId) {
    return "needs_client"
  }

  return "ready"
}

function StatusBadge({ status }: { status: WorkbookStatus | "in_progress" }) {
  const copy =
    status === "completed"
      ? { label: "Completed", className: "border-green-500/20 bg-green-500/5 text-green-100" }
      : status === "in_progress"
        ? { label: "In progress", className: "border-gf-pink/25 bg-gf-pink/10 text-white" }
        : status === "ready"
          ? { label: "Ready", className: "border-blue-500/20 bg-blue-500/5 text-blue-100" }
          : { label: "Needs client", className: "border-yellow-500/20 bg-yellow-500/5 text-yellow-100" }

  return <span className={`rounded-full border px-3 py-1 text-xs font-medium ${copy.className}`}>{copy.label}</span>
}

function StatusPill({
  label,
  value,
  good,
}: {
  label: string
  value: string
  good: boolean
}) {
  return (
    <div className="rounded-xl border border-gf-border bg-gf-surface/70 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-gf-muted">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${good ? "text-green-300" : "text-yellow-200"}`}>
        {value}
      </p>
    </div>
  )
}

function describeWorkbookType(mimeType: string) {
  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    return "Google Sheet"
  }

  if (mimeType === "text/csv" || mimeType === "application/csv") {
    return "CSV"
  }

  return "Excel"
}

function normalizeName(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ")
}

function matchSuggestedClient(clients: Client[], suggestedName: string | null) {
  const normalizedSuggested = normalizeName(suggestedName)
  if (!normalizedSuggested) {
    return null
  }

  return (
    clients.find((client) => normalizeName(client.name) === normalizedSuggested)
    ?? clients.find((client) => normalizeName(client.name).includes(normalizedSuggested))
    ?? clients.find((client) => normalizedSuggested.includes(normalizeName(client.name)))
    ?? null
  )
}

function buildMigrationSteps(analysis: WorkbookAnalysis, clientName: string): MigrationStep[] {
  const steps: MigrationStep[] = [
    {
      id: `${analysis.workbook.id}-structure`,
      label: `Reading ${analysis.workbook.name} and checking workbook structure`,
      status: "pending",
    },
    {
      id: `${analysis.workbook.id}-match`,
      label: `Matching ${clientName} to the correct Chameleon workspace`,
      status: "pending",
    },
  ]

  for (const tab of analysis.tabs) {
    const ambiguous = tab.confidence === "low" || tab.confidence === "medium"
    steps.push({
      id: `${analysis.workbook.id}-${tab.tabName}-map`,
      label: ambiguous
        ? `Inferring column mapping for ${tab.tabName} before sending it to ${tab.suggestedDestination}`
        : `Mapping ${tab.tabName} into ${tab.suggestedDestination}`,
      status: "pending",
    })
  }

  steps.push(
    {
      id: `${analysis.workbook.id}-preview`,
      label: "Preparing the Chameleon-side preview for confirmation",
      status: "pending",
    },
    {
      id: `${analysis.workbook.id}-summary`,
      label: "Summarising what changed and what was inferred",
      status: "pending",
    }
  )

  return steps
}

function buildIntroMessage(analysis: WorkbookAnalysis, clientName: string) {
  const fuzzyTabs = analysis.tabs.filter((tab) => tab.confidence !== "high").length
  return `I’m starting the migration thread for ${analysis.workbook.name} into ${clientName}'s Chameleon workspace. I’ll run through the workbook, infer any fuzzy headers, prepare the target mapping, and then show you a confirmation summary before we move on. ${fuzzyTabs > 0 ? `I’ve already flagged ${fuzzyTabs} tab${fuzzyTabs === 1 ? "" : "s"} that may need a little inference.` : "The tab structure looks clean, so this should be a straightforward pass."}`
}

function buildSummaryMessage(analysis: WorkbookAnalysis, clientName: string) {
  return `Migration prep is complete for ${clientName}. I’ve mapped ${analysis.tabs.length} tab${analysis.tabs.length === 1 ? "" : "s"}, built the Chameleon destination preview, and captured any inferred column matches in the summary below.`
}

function buildMigrationSummary(analysis: WorkbookAnalysis, clientName: string) {
  const inferredTabs = analysis.tabs.filter((tab) => tab.confidence !== "high")
  const destinations = Array.from(new Set(analysis.tabs.map((tab) => tab.suggestedDestination)))

  return [
    `Prepared ${analysis.tabs.length} tab${analysis.tabs.length === 1 ? "" : "s"} from ${analysis.workbook.name} for ${clientName}.`,
    `Destination areas: ${destinations.join(", ")}.`,
    inferredTabs.length > 0
      ? `Inference was used on ${inferredTabs.length} tab${inferredTabs.length === 1 ? "" : "s"} where legacy headers were less obvious.`
      : "All detected tab mappings were high-confidence matches.",
  ]
}

function appendMessage(messages: MigrationMessage[], message: MigrationMessage) {
  return messages.some((entry) => entry.id === message.id) ? messages : [...messages, message]
}
