import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClipboardCopy, FilePlus2, Download } from "lucide-react";
import JSZip from "jszip";
import FileSaver from "file-saver";
import CodeDisplay from "@/components/code-display";
import type { FileOutput } from "@/lib/types";

interface Props {
  files: FileOutput[];
  activeIndex: number;
  onSelect: (i: number) => void;
  isGenerating: boolean;
  error: string | null;
}

export default function GeneratedCodePanel({
  files,
  activeIndex,
  onSelect,
  isGenerating,
  error,
}: Props) {
  const copyToClipboard = (content: string) =>
    navigator.clipboard.writeText(content);
  const downloadFile = (file: FileOutput) =>
    FileSaver.saveAs(
      new Blob([file.content], { type: "text/plain" }),
      file.filename,
    );
  const downloadAll = () => {
    const zip = new JSZip();
    const dir = zip
      .folder("src")
      ?.folder("main")
      ?.folder("java")
      ?.folder("frc")
      ?.folder("robot")
      ?.folder("subsystems");
    if (!dir) return;
    files.forEach((f) => dir.file(f.filename, f.content));
    zip
      .generateAsync({ type: "blob" })
      .then((content) => FileSaver.saveAs(content, "FRCSubsystem.zip"));
  };

  if (isGenerating) {
    return (
      <Card className="p-6 text-center">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-3">Generating code...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-500">{error}</p>
      </Card>
    );
  }

  if (!files.length) {
    return (
      <Card className="p-6 text-center">
        <p>No code generated yet. Fill out the form to see generated code.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 bg-zinc-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2 overflow-x-auto">
          {files.map((f, i) => (
            <Button
              key={i}
              variant={i === activeIndex ? "default" : "outline"}
              size="sm"
              onClick={() => onSelect(i)}
            >
              {f.filename}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(files[activeIndex].content)}
          >
            <ClipboardCopy className="h-4 w-4 mr-1" /> Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadFile(files[activeIndex])}
          >
            <FilePlus2 className="h-4 w-4 mr-1" /> Save File
          </Button>
          <Button variant="default" size="sm" onClick={downloadAll}>
            <Download className="h-4 w-4 mr-1" /> Download All
          </Button>
        </div>
      </div>
      <CodeDisplay code={files[activeIndex].content} language="java" />
    </div>
  );
}
