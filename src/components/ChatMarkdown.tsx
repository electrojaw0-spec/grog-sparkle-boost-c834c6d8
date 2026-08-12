import React from "react";

/** Minimal, dependency-free markdown renderer tuned for chat answers. */
function inline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyBase}-i${i++}`;
    if (tok.startsWith("**")) nodes.push(<strong key={key} className="font-semibold">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) nodes.push(<code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{tok.slice(1, -1)}</code>);
    else nodes.push(<em key={key}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function ChatMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = (k: string) => {
    if (!list) return;
    const cls = "my-1 space-y-1 pl-5 " + (list.ordered ? "list-decimal" : "list-disc");
    blocks.push(
      list.ordered ? (
        <ol key={k} className={cls}>
          {list.items.map((it, i) => <li key={i} className="leading-relaxed">{inline(it, `${k}-${i}`)}</li>)}
        </ol>
      ) : (
        <ul key={k} className={cls}>
          {list.items.map((it, i) => <li key={i} className="leading-relaxed">{inline(it, `${k}-${i}`)}</li>)}
        </ul>
      ),
    );
    list = null;
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const key = `b${idx}`;
    const ol = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    const ul = line.match(/^\s*[-*•]\s+(.*)$/);
    const h = line.match(/^(#{1,4})\s+(.*)$/);

    if (ol) {
      if (!list || !list.ordered) { flush(key + "-f"); list = { ordered: true, items: [] }; }
      list.items.push(ol[2]);
      return;
    }
    if (ul) {
      if (!list || list.ordered) { flush(key + "-f"); list = { ordered: false, items: [] }; }
      list.items.push(ul[1]);
      return;
    }
    flush(key + "-f");
    if (!line.trim()) return;
    if (h) {
      blocks.push(<p key={key} className="mt-2 mb-1 font-semibold">{inline(h[2], key)}</p>);
      return;
    }
    blocks.push(<p key={key} className="my-1 leading-relaxed">{inline(line, key)}</p>);
  });
  flush("end");

  return <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{blocks}</div>;
}
