"use client"

import { useEffect, useRef, useLayoutEffect } from "react"
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

  // Split code into lines and preserve empty lines
  const codeLines = code.split("\n")

  return (
    <div className="relative rounded-md overflow-hidden code-container">
      <div className="flex">
        {/* Line numbers */}
        <div className="line-numbers p-4 text-right select-none">
          {codeLines.map((_, index) => (
            <div key={index} className="leading-6">
              {index + 1}
            </div>
          ))}
        </div>

        {/* Code content */}
        <pre ref={codeRef} className={`language-${language} p-4 overflow-x-auto flex-1 leading-6`}>
          <code className={`language-${language}`}>{code}</code>
        </pre>
      </div>
    </div>
  )
}
