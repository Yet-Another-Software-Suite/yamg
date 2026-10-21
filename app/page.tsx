import CodeGenerator from "@/components/code-generator"
import { SeasonSwitch } from "@/components/season-switch"

export default function Home() {
  return (
    <main className="relative min-h-screen text-foreground">
      <SeasonSwitch current="2027" />
      <header className="container mx-auto px-4 pt-6 pb-6 text-center">
        <p className="font-pixel text-sm uppercase text-primary">YAMG</p>
        <h1 className="mt-3 text-3xl font-bold">Yet Another Mechanisms Generator</h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Generate WPILib 2027 Java code for elevators, arms, pivots and flywheels, with or without YAMS
        </p>
      </header>
      <div aria-hidden className="yass-stripe" />
      <div className="container mx-auto px-4 py-6">
        <CodeGenerator />
      </div>
    </main>
  )
}
