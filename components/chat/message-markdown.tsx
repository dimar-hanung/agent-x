"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

interface MessageMarkdownProps {
  content: string;
  className?: string;
}

const components: Components = {
  p: ({ children }) => (
    <p className="mb-3 last:mb-0 [&:not(:first-child)]:mt-0">{children}</p>
  ),
  h1: ({ children }) => (
    <h1 className="mb-3 mt-4 text-lg font-semibold tracking-tight first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-4 text-base font-semibold tracking-tight first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-3 text-sm font-semibold first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-3 text-sm font-medium first:mt-0">{children}</h4>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed [&>ul]:mt-1 [&>ol]:mt-1">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-muted-foreground/30 text-muted-foreground mb-3 border-l-2 pl-3 italic last:mb-0">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary font-medium underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
  img: ({ src, alt }) =>
    src ? (
      // eslint-disable-next-line @next/next/no-img-element -- remote Docling/chat markdown images
      <img
        src={src}
        alt={alt ?? ""}
        className="my-3 max-h-80 max-w-full rounded-md border object-contain"
        loading="lazy"
      />
    ) : null,
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes("language-"));

    if (isBlock) {
      return (
        <code className={cn("font-mono text-[0.8125rem]", className)} {...props}>
          {children}
        </code>
      );
    }

    return (
      <code
        className="bg-muted rounded px-1 py-0.5 font-mono text-[0.8125rem]"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-muted mb-3 overflow-x-auto rounded-lg border p-3 text-[0.8125rem] last:mb-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto rounded-md border last:mb-0">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/50 border-b">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border-border px-3 py-2 font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-border border-t px-3 py-2 align-top">{children}</td>
  ),
  tr: ({ children }) => <tr className="even:bg-muted/20">{children}</tr>,
  hr: () => <hr className="border-border my-4" />,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => (
    <del className="text-muted-foreground line-through">{children}</del>
  ),
};

export function MessageMarkdown({ content, className }: MessageMarkdownProps) {
  return (
    <div
      className={cn(
        "text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
