"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MessageRendererProps = {
  content: string;
};

function normalizeAiContent(content: string) {
  return String(content || "")
    .replace(/&lt;br\s*\/?&gt;/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<\/?p>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .trim();
}

export default function MessageRenderer({ content }: MessageRendererProps) {
  return (
    <div className="message-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="markdown-table-wrap">
              <table>{children}</table>
            </div>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {normalizeAiContent(content)}
      </ReactMarkdown>
    </div>
  );
}