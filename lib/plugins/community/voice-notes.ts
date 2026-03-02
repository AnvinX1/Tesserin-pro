import React from "react"
import { FiMic } from "react-icons/fi"
import type { TesserinPlugin, TesserinPluginAPI } from "../types"

const voiceNotesPlugin: TesserinPlugin = {
  manifest: {
    id: "community.voice-notes",
    name: "Voice Notes",
    version: "1.0.0",
    description: "Quick audio memos — record voice notes that create timestamped markdown entries.",
    author: "Community",
    icon: React.createElement(FiMic, { size: 16 }),
    permissions: ["vault:read", "vault:write", "ui:notify", "commands", "panels"],
  },

  activate(api: TesserinPluginAPI) {
    let mediaRecorder: MediaRecorder | null = null
    let isRecording = false
    let startTime = 0
    let listeners: Array<() => void> = []
    const notify = () => listeners.forEach(fn => fn())
    const subscribe = (fn: () => void) => { listeners.push(fn); return () => { listeners = listeners.filter(l => l !== fn) } }

    api.registerCommand({
      id: "start-voice-note",
      label: "Start Voice Recording",
      category: "Voice Notes",
      async execute() {
        if (isRecording) { api.ui.showNotice("Already recording!"); return }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          const chunks: Blob[] = []
          mediaRecorder = new MediaRecorder(stream)

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data)
          }

          mediaRecorder.onstop = () => {
            stream.getTracks().forEach(t => t.stop())
            const duration = Math.round((Date.now() - startTime) / 1000)
            const now = new Date()
            const ts = now.toLocaleString()

            const content = [
              `---`,
              `type: voice-note`,
              `recorded: ${now.toISOString()}`,
              `duration: ${duration}s`,
              `---`,
              ``,
              `# 🎙️ Voice Note — ${ts}`,
              ``,
              `**Duration:** ${duration} seconds`,
              ``,
              `> *Audio was recorded. Transcribe above or add notes below.*`,
              ``,
              `## Notes`,
              ``,
              ``,
            ].join("\n")

            api.vault.create(`Voice Note ${ts}`, content)
            api.ui.showNotice(`🎙️ Voice note saved (${duration}s). A new note was created.`)
            isRecording = false
            notify()
          }

          mediaRecorder.start()
          isRecording = true
          startTime = Date.now()
          notify()
          api.ui.showNotice("🎙️ Recording started… Use 'Stop Voice Recording' to finish.")
        } catch (err) {
          api.ui.showNotice("Microphone access denied or not available.")
        }
      },
    })

    api.registerCommand({
      id: "stop-voice-note",
      label: "Stop Voice Recording",
      category: "Voice Notes",
      execute() {
        if (!isRecording || !mediaRecorder) {
          api.ui.showNotice("No recording in progress.")
          return
        }
        mediaRecorder.stop()
      },
    })

    api.registerStatusBarWidget({
      id: "voice-recording",
      align: "left",
      priority: 1,
      component: function VoiceWidget() {
        const [, setTick] = React.useState(0)
        React.useEffect(() => subscribe(() => setTick(t => t + 1)), [])
        React.useEffect(() => {
          if (!isRecording) return
          const i = setInterval(() => setTick(t => t + 1), 1000)
          return () => clearInterval(i)
        }, [isRecording])

        if (!isRecording) return null
        const elapsed = Math.round((Date.now() - startTime) / 1000)
        return React.createElement("div", {
          className: "flex items-center gap-1.5 text-[10px] animate-pulse",
          style: { color: "#ef4444" },
        },
          React.createElement("span", null, "⏺"),
          React.createElement("span", null, `REC ${elapsed}s`),
        )
      },
    })
  },
}

export default voiceNotesPlugin
