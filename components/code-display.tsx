"use client";

import { useEffect, useRef, useLayoutEffect, useState } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-java";
import "./prism-frc-theme.css"; // Custom theme

function suppressResizeObserverErrors() {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (
      args[0]?.includes?.("ResizeObserver loop") ||
      (typeof args[0] === "string" && args[0].includes("ResizeObserver loop"))
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

interface CodeDisplayProps {
  code: string;
  language: string;
}

export default function CodeDisplay({ code, language }: CodeDisplayProps) {
  const codeRef = useRef<HTMLPreElement>(null);
  const [displayCode, setDisplayCode] = useState("");
  const [importCount, setImportCount] = useState(0);
  const [lineOffset, setLineOffset] = useState(0);
  const [hasImports, setHasImports] = useState(false);

  useLayoutEffect(() => {
    suppressResizeObserverErrors();

    // Clean up
    return () => {
      console.error = console.error;
    };
  }, []);

  // Process code whenever it changes
  useEffect(() => {
    // Split code into imports and implementation
    const lines = code.split("\n");

    // Find where imports end (look for the last import statement)
    let importEndIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("import ")) {
        importEndIndex = i + 1; // Set to the line after the import
      }
    }

    // If we have package declaration but no imports, set importEndIndex after the package
    if (importEndIndex === 0) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("package ")) {
          importEndIndex = i + 1;
          break;
        }
      }
    }

    // Skip any blank lines after the last import
    while (
      importEndIndex < lines.length &&
      lines[importEndIndex].trim() === ""
    ) {
      importEndIndex++;
    }

    const importLines = lines.slice(0, importEndIndex);
    const implementationLines = lines.slice(importEndIndex);

    // Determine if we have imports to show/hide
    const importsExist = importLines.some((line) =>
      line.trim().startsWith("import "),
    );
    setHasImports(importsExist);

    // Count imports for display
    const actualImportCount = importLines.filter((l) =>
      l.trim().startsWith("import "),
    ).length;
    setImportCount(actualImportCount);

    // Set line offset for numbering
    setLineOffset(importLines.length);

    // Create the display code - always hide imports
    setDisplayCode(implementationLines.join("\n"));
  }, [code]);

  // Optimize the highlighting to prevent excessive reflows
  useEffect(() => {
    if (typeof window !== "undefined" && codeRef.current && displayCode) {
      // Use requestAnimationFrame to ensure DOM is ready
      const highlightCode = () => {
        try {
          Prism.highlightElement(codeRef.current);
        } catch (e) {
          console.warn("Prism highlighting error:", e);
        }
      };

      const timeoutId = setTimeout(() => {
        requestAnimationFrame(highlightCode);
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [displayCode]);

  // Generate line numbers based on the current display code
  const lineNumbers = displayCode
    .split("\n")
    .map((_, index) => index + lineOffset + 1);

  return (
    <div className="relative rounded-md overflow-hidden code-container">
      {hasImports && (
        <div className="flex justify-between items-center p-2 bg-slate-700 border-b border-slate-600">
          <span className="text-sm text-slate-300">{`${importCount} imports hidden`}</span>
        </div>
      )}

      <div className="flex">
        {/* Line numbers */}
        <div className="line-numbers p-4 text-right select-none">
          {lineNumbers.map((num, index) => (
            <div key={`line-${index}`} className="leading-6">
              {num}
            </div>
          ))}
        </div>

        {/* Code content */}
        <pre
          ref={codeRef}
          className={`language-${language} p-4 overflow-x-auto flex-1 leading-6`}
        >
          <code className={`language-${language}`}>{displayCode}</code>
        </pre>
      </div>
    </div>
  );
}
