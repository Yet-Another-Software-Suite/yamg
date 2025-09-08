"use client";

import { useState, useEffect, useRef } from "react";
import { Form } from "@/components/ui/form";
import MechanismForm from "@/components/mechanism-form";
import SimulationTab from "@/components/simulation-tab";
import GeneratedCodePanel from "./generatedCodePanel";
import MobileLayout from "./mobileLayout";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCodeGeneratorForm } from "./useCodeGeneratorForm";
import { generateFiles } from "@/lib/code-generator";
import type { FormValues, FileOutput } from "@/lib/types";
import ErrorBoundary from "@/components/error-boundary";

export default function CodeGenerator() {
  const form = useCodeGeneratorForm();

  const [activeTab, setActiveTab] = useState("inputs");
  const [files, setFiles] = useState<FileOutput[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shouldRegenerateCode = useRef(true);

  // Watch form changes → mark code for regeneration
  useEffect(() => {
    const sub = form.watch(() => (shouldRegenerateCode.current = true));
    return () => sub.unsubscribe();
  }, [form]);

  // Regen code if tab changes.
  useEffect(()=>{shouldRegenerateCode.current = true}, [activeFileIndex]);

  // Generate code when form changes
  useEffect(() => {
    const generate = async () => {
      console.log("Active Index: "+activeFileIndex)
      if (!shouldRegenerateCode.current) return;
      try {
        setIsGenerating(true);
        setError(null);
        const values = form.getValues() as FormValues;
        const generated = await generateFiles(values);
        setFiles(generated);
        if (activeFileIndex >= generated.length) setActiveFileIndex(0);
        shouldRegenerateCode.current = false;
      } catch (e) {
        setError(
          `Error generating code: ${e instanceof Error ? e.message : String(e)}`,
        );
      } finally {
        setIsGenerating(false);
      }
    };
    generate();
  }, [form, activeFileIndex, form.formState]);

  // Responsive layout detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <ErrorBoundary>
      <div className="flex flex-col lg:flex-row gap-6">
        {isMobile ? (
          <MobileLayout
            form={form}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            files={files}
            activeFileIndex={activeFileIndex}
            setActiveFileIndex={setActiveFileIndex}
            isGenerating={isGenerating}
            error={error}
          />
        ) : (
          <>
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
                  <GeneratedCodePanel
                    files={files}
                    activeIndex={activeFileIndex}
                    onSelect={setActiveFileIndex}
                    isGenerating={isGenerating}
                    error={error}
                  />
                </TabsContent>
                <TabsContent value="simulation">
                  <SimulationTab
                    formValues={form.getValues() as FormValues}
                    key={form.formState.submitCount}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
