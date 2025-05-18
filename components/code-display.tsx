"use client"

import { useEffect, useRef, useLayoutEffect, useState } from "react"
import Prism from "prismjs"
import "prismjs/components/prism-java"
import "./prism-frc-theme.css" // Custom theme

function suppressResizeObserverErrors() {
  const originalConsoleError = console.error
  console.error = (...args) => {
    if (
      args[0]?.includes?.("ResizeObserver loop") ||
      (typeof args[0] === "string" && args[0].includes("ResizeObserver loop"))
    ) {
      return
    }
    originalConsoleError.apply(console, args)
  }
}

interface CodeDisplayProps {
  code: string
  language: string
}

export default function CodeDisplay({ code, language }: CodeDisplayProps) {
  const codeRef = useRef<HTMLPreElement>(null)

  useLayoutEffect(() => {
    suppressResizeObserverErrors()

    // Clean up
    return () => {
      console.error = console.error
    }
  }, [])

  // Optimize the highlighting to prevent excessive reflows
  useEffect(() => {
    if (typeof window !== "undefined" && codeRef.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      const highlightCode = () => {
        try {
          Prism.highlightElement(codeRef.current)
        } catch (e) {
          console.warn("Prism highlighting error:", e)
        }
      }

      const timeoutId = setTimeout(() => {
        requestAnimationFrame(highlightCode)
      }, 0)

      return () => clearTimeout(timeoutId)
    }
  }, [code])

  // Split code into imports and implementation
  const lines = code.split("\n")

  // Find where imports end (look for the last import statement)
  let importEndIndex = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith("import ")) {
      importEndIndex = i + 1 // Set to the line after the import
    }
  }

  // If we have package declaration but no imports, set importEndIndex after the package
  if (importEndIndex === 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith("package ")) {
        importEndIndex = i + 1
        break
      }
    }
  }

  // Skip any blank lines after the last import
  while (importEndIndex < lines.length && lines[importEndIndex].trim() === "") {
    importEndIndex++
  }

  const importLines = lines.slice(0, importEndIndex)
  const implementationLines = lines.slice(importEndIndex)

  // Determine if we have imports to show/hide
  const hasImports = importLines.some((line) => line.trim().startsWith("import "))

  return (
    <div className="relative rounded-md overflow-hidden code-container">
      {hasImports && (
        <div className="flex justify-between items-center p-2 bg-slate-700 border-b border-slate-600">
          <span className="text-sm text-slate-300">
            {`${importLines.filter((l) => l.trim().startsWith("import")).length} imports hidden`}
          </span>
        </div>
      )}

      <div className="flex">
        {/* Line numbers */}
        <div className="line-numbers p-4 text-right select-none">
          {importLines.map((_, index) => (
              <div key={`import-${index}`} className="leading-6">
                {index + 1}
              </div>
            ))}
          {implementationLines.map((_, index) => (
            <div key={`impl-${index}`} className="leading-6">
              {index + importLines.length + 1}
            </div>
          ))}
        </div>

        {/* Code content */}
        <pre ref={codeRef} className={`language-${language} p-4 overflow-x-auto flex-1 leading-6`}>
          <code className={`language-${language}`}>
            {importLines.join("\n")}
            {importLines.length > 0 && "\n"}
            {implementationLines.join("\n")}
          </code>
        </pre>
      </div>
    </div>
  )
}
