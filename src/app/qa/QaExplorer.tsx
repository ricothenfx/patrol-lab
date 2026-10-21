"use client";

import { useMemo, useState } from "react";
import { QA_ENTRIES, QA_TAGS, type QaTag } from "./qa-data";

export function QaExplorer() {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<QaTag | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return QA_ENTRIES.filter((e) => {
      if (tag && !e.tags.includes(tag)) return false;
      if (!q) return true;
      return e.q.toLowerCase().includes(q) || textOf(e.a).includes(q);
    });
  }, [query, tag]);

  return (
    <>
      <div className="qa-toolbar">
        <input
          className="qa-search"
          data-testid="qa-search"
          type="search"
          placeholder="search questions and answers…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="qa-count" data-testid="qa-count">
          {results.length}/{QA_ENTRIES.length} answered
        </span>
      </div>

      <div className="qa-tags" data-testid="qa-tags">
        <button
          className={tag === null ? "qa-tag active" : "qa-tag"}
          onClick={() => setTag(null)}
        >
          all
        </button>
        {QA_TAGS.map((t) => (
          <button
            key={t}
            className={tag === t ? "qa-tag active" : "qa-tag"}
            onClick={() => setTag(tag === t ? null : t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="qa-list" data-testid="qa-list">
        {results.map((e) => (
          <article key={e.id} className="qa-card" data-testid="qa-card">
            <h3 className="qa-q">{e.q}</h3>
            <p className="qa-a">{e.a}</p>
            <div className="qa-card-tags">
              {e.tags.map((t) => (
                <span key={t} className="qa-card-tag">
                  {t}
                </span>
              ))}
            </div>
          </article>
        ))}
        {results.length === 0 && (
          <div className="qa-empty" data-testid="qa-empty">
            no question matches “{query}”{tag ? ` in ${tag}` : ""} — try a different term or clear
            the tag filter.
          </div>
        )}
      </div>
    </>
  );
}

/** Flatten a ReactNode answer to plain text so search covers the answers. */
function textOf(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  if (typeof node === "object" && "props" in (node as { props?: unknown })) {
    const el = node as { props?: { children?: React.ReactNode } };
    return textOf(el.props?.children);
  }
  return "";
}
