import CodeGenerator from "@/components/code-generator"
import { SeasonSwitch } from "@/components/season-switch"

export default function Home() {
  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <SeasonSwitch current="2027" />
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-center mb-6">Yet Another Mechanisms Generator</h1>
        <p className="text-center text-muted-foreground mb-8">
          Generate WPILib 2027 Java code for elevators, arms, pivots and flywheels, with or without YAMS
        </p>
        <CodeGenerator />
      </div>
    </main>
  )
}
