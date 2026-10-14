import CodeGenerator from "@/components/code-generator"
import { SeasonSwitch } from "@/components/season-switch"

export default function Home() {
  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <SeasonSwitch current="2026" />
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-center mb-6">Yet Another Mechanisms Generator</h1>
        <p className="text-center text-muted-foreground mb-8">
          Generate command-based Java code for elevator, arm, and pivot subsystems
        </p>
        <CodeGenerator />
      </div>
    </main>
  )
}
