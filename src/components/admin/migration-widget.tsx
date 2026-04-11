"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Select } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Bot, ChevronDown, Loader2, Search, Sparkles, X } from "lucide-react"
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
}

export function MigrationWidget() {
  const [open, setOpen] = useState(false)
  const [bootstrap, setBootstrap] = useState<MigrationBootstrap | null>(null)
  const [loadingBootstrap, setLoadingBootstrap] = useState(false)
  const [loadingWorkbooks, setLoadingWorkbooks] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState("")
  const [workbooks, setWorkbooks] = useState<MigrationWorkbook[]>([])
  const [selectedClientId, setSelectedClientId] = useState("")
  const [selectedWorkbookIds, setSelectedWorkbookIds] = useState<string[]>([])
  const [analyses, setAnalyses] = useState<WorkbookAnalysis[]>([])
  const [analysisMode, setAnalysisMode] = useState<"heuristic" | "hybrid">("heuristic")
  const [introDismissed, setIntroDismissed] = useState(false)
  const [manualSource, setManualSource] = useState("")
  const [addingManualSource, setAddingManualSource] = useState(false)
  const [showManualImport, setShowManualImport] = useState(false)
  const [sheetSearch, setSheetSearch] = useState("")

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
      if (!selectedClientId && Array.isArray(data.clients) && data.clients.length > 0) {
        setSelectedClientId(data.clients[0].id)
      }
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
    if (!selectedClientId || selectedWorkbooks.length === 0) {
      return
    }

    setAnalyzing(true)
    setError("")

    try {
      const res = await fetch("/api/migration/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          workbooks: selectedWorkbooks,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze selected workbooks.")
      }

      setAnalyses(data.analyses ?? [])
      setAnalysisMode(data.mode === "hybrid" ? "hybrid" : "heuristic")
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
        <div className="fixed bottom-24 right-6 z-50 w-[min(28rem,calc(100vw-2rem))]">
          <Card className="max-h-[75vh] overflow-y-auto border-gf-pink/20 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gf-pink">Migration Assistant</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Bring legacy Google Sheets into Chameleon</h2>
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
              <div className="mb-4 rounded-xl border border-gf-border bg-gf-surface/80 p-4 text-sm text-gf-muted">
                <p className="text-white">
                  I can inspect your existing Google Sheets, classify each tab, and propose where it should land inside Chameleon.
                </p>
                <p className="mt-2">
                  V1 is Google Sheets only. Pick one or more source workbooks, choose the Chameleon client they belong to, and I&apos;ll analyse them one at a time before any import step.
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
            )}

            {loadingBootstrap ? (
              <div className="flex items-center gap-3 rounded-xl border border-gf-border bg-gf-surface/70 p-4 text-sm text-gf-muted">
                <Loader2 size={16} className="animate-spin" />
                Checking migration readiness...
              </div>
            ) : null}

            {bootstrap && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatusPill label="Google" value={bootstrap.google_connected ? "Connected" : "Not connected"} good={bootstrap.google_connected} />
                  <StatusPill
                    label="Workspace"
                    value={bootstrap.workspace_status === "healthy" ? "Ready" : bootstrap.workspace_status}
                    good={bootstrap.workspace_status === "healthy"}
                  />
                </div>

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
                    <Select
                      label="Target Client"
                      options={bootstrap.clients.map((client) => ({
                        value: client.id,
                        label: client.name,
                      }))}
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                    />

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
                              className={`block rounded-xl border px-3 py-3 text-sm transition-colors ${
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
                                    {workbook.mimeType === "application/vnd.google-apps.spreadsheet"
                                      ? "Google Sheet"
                                      : workbook.mimeType === "text/csv" || workbook.mimeType === "application/csv"
                                        ? "CSV"
                                        : "Excel"}
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
                      disabled={!selectedClientId || selectedWorkbookIds.length === 0 || analyzing}
                      onClick={() => void analyzeSelectedWorkbooks()}
                    >
                      {analyzing
                        ? `Analysing ${selectedWorkbookIds.length} selected ${selectedWorkbookIds.length === 1 ? "sheet" : "sheets"}...`
                        : `Analyse ${selectedWorkbookIds.length || ""} selected ${selectedWorkbookIds.length === 1 ? "sheet" : "sheets"}`.trim()}
                    </Button>
                  </>
                )}

                {error && <p className="text-sm text-red-400">{error}</p>}

                {analyses.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gf-muted">
                      <Sparkles size={14} className="text-gf-pink" />
                      Analysis mode: {analysisMode === "hybrid" ? "hybrid" : "heuristic"}
                    </div>
                    {analyses.map((analysis) => (
                      <div key={analysis.workbook.id} className="rounded-xl border border-gf-border bg-gf-black/30 p-4">
                        <div className="mb-3">
                          <p className="font-semibold text-white">{analysis.workbook.name}</p>
                          <p className="text-xs text-gf-muted">
                            {analysis.tabs.length} tabs inspected
                          </p>
                        </div>
                        <div className="space-y-3">
                          {analysis.tabs.map((tab) => (
                            <div key={tab.tabName} className="rounded-xl border border-gf-border bg-gf-surface/50 p-3">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <p className="font-medium text-white">{tab.tabName}</p>
                                <Badge variant={tab.confidence === "high" ? "success" : tab.confidence === "medium" ? "warning" : "default"}>
                                  {tab.confidence}
                                </Badge>
                              </div>
                              <p className="text-sm text-gf-muted">
                                Suggested destination: <span className="text-white">{tab.suggestedDestination}</span>
                              </p>
                              {tab.headers.length > 0 && (
                                <p className="mt-2 text-xs text-gf-muted">
                                  Headers: {tab.headers.join(", ")}
                                </p>
                              )}
                              {tab.notes.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {tab.notes.map((note) => (
                                    <p key={note} className="text-xs text-gf-muted">
                                      {note}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  )
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
