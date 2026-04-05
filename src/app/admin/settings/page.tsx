"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link2, CheckCircle, AlertCircle } from "lucide-react"

export default function SettingsPage() {
  const [connected, setConnected] = useState<boolean | null>(null)

  useEffect(() => {
    fetch("/api/google/connect")
      .then((res) => res.json())
      .then((data) => setConnected(data.connected))
      .catch(() => setConnected(false))
  }, [])

  function handleConnect() {
    window.location.href = "/api/google/connect?action=auth"
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-gf-muted mb-8">Manage your integrations</p>

      <Card>
        <CardTitle>Google Sheets Connection</CardTitle>
        <p className="text-sm text-gf-muted mt-2 mb-4">
          Connect your Google account so client sheets are created in your
          Drive and meal plans sync automatically.
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {connected === null ? (
              <Badge>Checking...</Badge>
            ) : connected ? (
              <>
                <CheckCircle size={16} className="text-green-400" />
                <Badge variant="success">Connected</Badge>
              </>
            ) : (
              <>
                <AlertCircle size={16} className="text-yellow-400" />
                <Badge variant="warning">Not connected</Badge>
              </>
            )}
          </div>

          <Button
            variant={connected ? "secondary" : "primary"}
            size="sm"
            onClick={handleConnect}
          >
            <Link2 size={14} className="mr-1.5" />
            {connected ? "Reconnect" : "Connect Google"}
          </Button>
        </div>
      </Card>
    </div>
  )
}
