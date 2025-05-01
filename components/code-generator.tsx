"use client"

import { useState, useEffect, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Download, FilePlus2, ClipboardCopy } from "lucide-react"
import JSZip from "jszip"
import FileSaver from "file-saver"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Form } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import MechanismForm from "@/components/mechanism-form"
import CodeDisplay from "@/components/code-display"
import SimulationTab from "@/components/simulation-tab"
import { generateFiles } from "@/lib/code-generator"
import type { FormValues, FileOutput } from "@/lib/types"
import ErrorBoundary from "@/components/error-boundary"

export default function CodeGenerator() {
  const [activeTab, setActiveTab] = useState<string>("inputs")
  const [generatedFiles, setGeneratedFiles] = useState<FileOutput[]>([])
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0)
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Use a ref to track if we need to regenerate code
  const shouldRegenerateCode = useRef(true)

  const formSchema = z.object({
    subsystemName: z.string().min(1, "Subsystem name is required"),
    mechanismType: z.enum(["Elevator", "Arm", "Pivot"]),
    motorControllerType: z.enum(["ThriftyNova", "SparkMAX", "SparkFlex", "TalonFX", "TalonFXS"]),
    motorType: z.enum(["NEO", "NEO550", "Minion", "Krakenx40", "Krakenx60"]),
    canId: z.number().int().min(0).max(62),
    pidValues: z.object({
      kP: z.number(),
      kI: z.number(),
      kD: z.number(),
    }),
    maxAcceleration: z.number().optional(),
    maxVelocity: z.number().optional(),
    feedforward: z
      .object({
        kS: z.number().optional(),
        kV: z.number().optional(),
        kA: z.number().optional(),
        kG: z.number().optional(),
      })
      .optional(),
    gearRatio: z.number().min(0.001),
    softLimits: z
      .object({
        forward: z.number().optional(),
        reverse: z.number().optional(),
      })
      .optional(),
    brakeMode: z.boolean(),
    currentLimits: z
      .object({
        stator: z.number().optional(),
        supply: z.number().optional(),
      })
      .optional(),
    rampRates: z
      .object({
        openLoop: z.number().min(0).optional(),
        closedLoop: z.number().min(0).optional(),
      })
      .optional(),
    telemetry: z.object({
      ntKey: z.string(),
      position: z.boolean(),
      velocity: z.boolean(),
      voltage: z.boolean(),
      temperature: z.boolean(),
      current: z.boolean(),
      positionUnit: z.enum(["Rotations", "Radians", "Degrees"]),
    }),
    // Mechanism specific parameters
    armParams: z
      .object({
        length: z.number().optional(),
        hardLimitMax: z.number().optional(),
        hardLimitMin: z.number().optional(),
        startingPosition: z.number().optional(),
        mass: z.number().optional(),
        massUnit: z.enum(["kg", "lbs"]).optional(),
      })
      .optional(),
    elevatorParams: z
      .object({
        startingHeight: z.number().optional(),
        hardLimitMax: z.number().optional(),
        hardLimitMin: z.number().optional(),
        mass: z.number().optional(),
        massUnit: z.enum(["kg", "lbs"]).optional(),
        drumRadius: z.number().optional(),
      })
      .optional(),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subsystemName: "ElevatorSubsystem",
      mechanismType: "Elevator",
      motorControllerType: "SparkMAX",
      motorType: "NEO",
      canId: 1,
      pidValues: {
        kP: 0.1,
        kI: 0.0,
        kD: 0.0,
      },
      maxAcceleration: 1.0,
      maxVelocity: 1.0,
      feedforward: {
        kS: 0.0,
        kV: 0.0,
        kA: 0.0,
        kG: 0.0,
      },
      gearRatio: 1.0,
      softLimits: {
        forward: undefined,
        reverse: undefined,
      },
      brakeMode: true,
      currentLimits: {
        stator: 40,
        supply: undefined,
      },
      rampRates: {
        openLoop: 0.0,
        closedLoop: 0.0,
      },
      telemetry: {
        ntKey: "Subsystem",
        position: true,
        velocity: true,
        voltage: true,
        temperature: false,
        current: false,
        positionUnit: "Rotations",
      },
      armParams: {
        length: 1.0,
        hardLimitMax: 90,
        hardLimitMin: 0,
        startingPosition: 0,
        mass: 5,
        massUnit: "kg",
      },
      elevatorParams: {
        startingHeight: 0.0,
        hardLimitMax: 1.0,
        hardLimitMin: 0.0,
        mass: 5,
        massUnit: "kg",
        drumRadius: 0.0254, // 1 inch in meters
      },
    },
  })

  const watchMechanismType = form.watch("mechanismType")
  const watchMotorControllerType = form.watch("motorControllerType")
  const watchMotorType = form.watch("motorType")

  // Subscribe to form changes to trigger code regeneration
  useEffect(() => {
    const subscription = form.watch(() => {
      shouldRegenerateCode.current = true
    })

    return () => subscription.unsubscribe()
  }, [form])

  // Generate code when needed
  useEffect(() => {
    const generateCode = async () => {
      if (shouldRegenerateCode.current) {
        try {
          setIsGenerating(true)
          setError(null)
          const formValues = form.getValues() as FormValues
          const files = await generateFiles(formValues)
          setGeneratedFiles(files)
          if (activeFileIndex >= files.length) {
            setActiveFileIndex(0)
          }
          shouldRegenerateCode.current = false
        } catch (error) {
          console.error("Error generating code:", error)
          setError(`Error generating code: ${error instanceof Error ? error.message : String(error)}`)
        } finally {
          setIsGenerating(false)
        }
      }
    }

    generateCode()
  }, [form, activeFileIndex, form.formState])

  // Handle responsive layout
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth < 1024) {
        setActiveTab("inputs")
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const downloadFile = (file: FileOutput) => {
    const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" })
    FileSaver.saveAs(blob, file.filename)
  }

  const downloadAllFiles = () => {
    const zip = new JSZip()

    // Create directory structure
    const srcDir = zip.folder("src")
    const mainDir = srcDir?.folder("main")
    const javaDir = mainDir?.folder("java")
    const robotDir = javaDir?.folder("frc")
    const robotSubsystemsDir = robotDir?.folder("robot")?.folder("subsystems")

    if (!robotSubsystemsDir) return

    // Add files to the appropriate directories
    generatedFiles.forEach((file) => {
      robotSubsystemsDir.file(file.filename, file.content)
    })

    // Generate and download the zip file
    zip.generateAsync({ type: "blob" }).then((content) => {
      FileSaver.saveAs(content, "FRCSubsystem.zip")
    })
  }

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col lg:flex-row gap-6">
        {isMobile ? (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inputs">Inputs</TabsTrigger>
              <TabsTrigger value="code">Generated Code</TabsTrigger>
              <TabsTrigger value="simulation">Simulation</TabsTrigger>
            </TabsList>
            <TabsContent value="inputs" className="mt-4">
              <Form {...form}>
                <form className="space-y-6">
                  <MechanismForm form={form} />
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="code" className="mt-4">
              {isGenerating ? (
                <Card className="p-6 text-center">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="ml-3">Generating code...</p>
                  </div>
                </Card>
              ) : error ? (
                <Card className="p-6 text-center">
                  <p className="text-red-500">{error}</p>
                </Card>
              ) : generatedFiles.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2 overflow-x-auto">
                      {generatedFiles.map((file, index) => (
                        <Button
                          key={index}
                          variant={index === activeFileIndex ? "default" : "outline"}
                          size="sm"
                          onClick={() => setActiveFileIndex(index)}
                          className="whitespace-nowrap"
                        >
                          {file.filename}
                        </Button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generatedFiles[activeFileIndex].content)}
                      >
                        <ClipboardCopy className="h-4 w-4 mr-1" /> Copy
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => downloadFile(generatedFiles[activeFileIndex])}>
                        <FilePlus2 className="h-4 w-4 mr-1" /> Save File
                      </Button>
                      <Button variant="default" size="sm" onClick={downloadAllFiles}>
                        <Download className="h-4 w-4 mr-1" /> Download All
                      </Button>
                    </div>
                  </div>
                  <CodeDisplay code={generatedFiles[activeFileIndex].content} language="java" />
                </div>
              ) : (
                <Card className="p-6 text-center">
                  <p>No code generated yet. Fill out the form to see generated code.</p>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="simulation" className="mt-4">
              <SimulationTab formValues={form.getValues() as FormValues} />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            {/* Desktop layout */}
            <div className="w-1/3">
              <Form {...form}>
                <form className="space-y-6">
                  <MechanismForm form={form} />
                </form>
              </Form>
            </div>
            <Separator orientation="vertical" />
            <div className="w-2/3">
              <Tabs defaultValue="code" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="code">Generated Code</TabsTrigger>
                  <TabsTrigger value="simulation">Simulation</TabsTrigger>
                </TabsList>
                <TabsContent value="code">
                  {isGenerating ? (
                    <Card className="p-6 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        <p className="ml-3">Generating code...</p>
                      </div>
                    </Card>
                  ) : error ? (
                    <Card className="p-6 text-center">
                      <p className="text-red-500">{error}</p>
                    </Card>
                  ) : generatedFiles.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex gap-2 overflow-x-auto">
                          {generatedFiles.map((file, index) => (
                            <Button
                              key={index}
                              variant={index === activeFileIndex ? "default" : "outline"}
                              size="sm"
                              onClick={() => setActiveFileIndex(index)}
                              className="whitespace-nowrap"
                            >
                              {file.filename}
                            </Button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(generatedFiles[activeFileIndex].content)}
                          >
                            <ClipboardCopy className="h-4 w-4 mr-1" /> Copy
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(generatedFiles[activeFileIndex])}
                          >
                            <FilePlus2 className="h-4 w-4 mr-1" /> Save File
                          </Button>
                          <Button variant="default" size="sm" onClick={downloadAllFiles}>
                            <Download className="h-4 w-4 mr-1" /> Download All
                          </Button>
                        </div>
                      </div>
                      <CodeDisplay code={generatedFiles[activeFileIndex].content} language="java" />
                    </div>
                  ) : (
                    <Card className="p-6 text-center">
                      <p>No code generated yet. Fill out the form to see generated code.</p>
                    </Card>
                  )}
                </TabsContent>
                <TabsContent value="simulation">
                  <SimulationTab formValues={form.getValues() as FormValues} />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  )
}
