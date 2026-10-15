"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClipboardCopy, FilePlus2, Download, Link } from "lucide-react";
import JSZip from "jszip";
import FileSaver from "file-saver";
import CodeDisplay from "@/components/code-display";
import type { FileOutput } from "@/lib/types";
import { useEffect, useState } from "react";

interface Props {
  files: FileOutput[];
  activeIndex: number;
  onSelect: (i: number) => void;
  isGenerating: boolean;
  error: string | null;
  /** Copy a link that loads the form as it is now. */
  onCopyLink?: () => Promise<void>;
}

export default function GeneratedCodePanel({
  files,
  activeIndex,
  onSelect,
  isGenerating,
  error,
  onCopyLink,
}: Props) {
  const [linkCopied, setLinkCopied] = useState(false);
  const copyLink = async () => {
    if (!onCopyLink) return;
    await onCopyLink();
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };
  const copyToClipboard = (content: string) =>
    navigator.clipboard.writeText(content);
  // Filenames are relative to src/main/java/first/robot, for example "subsystems/Arm.java".
  const baseName = (file: FileOutput) => file.filename.split("/").pop() ?? file.filename;
  const downloadFile = (file: FileOutput) =>
    FileSaver.saveAs(
      new Blob([file.content], { type: "text/plain" }),
      baseName(file),
    );
  const downloadAll = () => {
    const zip = new JSZip();
    files.forEach((f) => zip.file(`src/main/java/first/robot/${f.filename}`, f.content));
    zip
      .generateAsync({ type: "blob" })
      .then((content) => FileSaver.saveAs(content, `${baseName(files[0]).replace(/\.java$/, "")}.zip`));
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
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-2">
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
        <div className="flex flex-wrap gap-2 w-full sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none">
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
          {onCopyLink && (
            <Button variant="outline" size="sm" onClick={copyLink} title="Copy a link that opens YAMG with this form filled in">
              <Link className="h-4 w-4 mr-1" /> {linkCopied ? "Link Copied" : "Copy Link"}
            </Button>
          )}
          <Button variant="default" size="sm" onClick={downloadAll}>
            <Download className="h-4 w-4 mr-1" /> Download All
          </Button>
        </div>
      </div>
      <CodeDisplay files={files}
                   activeIndex={activeIndex}
                   language="java" />
    </div>
  );
}
