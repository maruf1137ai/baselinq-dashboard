import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * How Linq's answers are rendered in every chat (Part 15): GitHub-flavoured markdown, so the tables and
 * lists the model writes show as tables and lists, and links open in a new tab without access to this page.
 * Each chat keeps its own look by passing its `components`.
 */
const BASE: Components = {
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-border bg-muted px-2 py-1 text-left font-medium">{children}</th>,
  td: ({ children }) => <td className="border border-border px-2 py-1 align-top">{children}</td>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
      {children}
    </a>
  ),
};

export function AIMarkdown({ children, components }: { children: string; components?: Components }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ ...BASE, ...components }}>
      {children}
    </ReactMarkdown>
  );
}
