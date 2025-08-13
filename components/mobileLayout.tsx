import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MechanismForm from "@/components/mechanism-form";
import GeneratedCodePanel from "./generatedCodePanel";
import SimulationTab from "@/components/simulation-tab";
import { Form } from "@/components/ui/form";
import type { FormValues, FileOutput } from "@/lib/types";

interface Props {
  form: any;
  activeTab: string;
  setActiveTab: (v: string) => void;
  files: FileOutput[];
  activeFileIndex: number;
  setActiveFileIndex: (i: number) => void;
  isGenerating: boolean;
  error: string | null;
}

export default function MobileLayout({
  form,
  activeTab,
  setActiveTab,
  files,
  activeFileIndex,
  setActiveFileIndex,
  isGenerating,
  error,
}: Props) {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
        <GeneratedCodePanel
          files={files}
          activeIndex={activeFileIndex}
          onSelect={setActiveFileIndex}
          isGenerating={isGenerating}
          error={error}
        />
      </TabsContent>
      <TabsContent value="simulation" className="mt-4">
        <SimulationTab
          formValues={form.getValues() as FormValues}
          key={form.formState.submitCount}
        />
      </TabsContent>
    </Tabs>
  );
}
