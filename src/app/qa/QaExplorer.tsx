"use client";

import { useMemo, useState } from "react";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { QA_CONTENT, QA_TAGS, QA_TAG_LABELS, type QaTag } from "./qa-data";

export function QaExplorer() {
  const t = useT();
  const { locale } = useLocale();
  const entries = QA_CONTENT[locale];
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<QaTag | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (tag && !e.tags.includes(tag)) return false;
      if (!q) return true;
      return e.q.toLowerCase().includes(q) || textOf(e.a).includes(q);
    });
  }, [entries, query, tag]);

  return (
    <>
      <div className="qa-toolbar">
        <input
          className="qa-search"
          data-testid="qa-search"
          type="search"
          placeholder={t.qa.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="qa-count" data-testid="qa-count">
          {t.qa.answered(results.length, entries.length)}
        </span>
      </div>

      <div className="qa-tags" data-testid="qa-tags">
        <button
          className={tag === null ? "qa-tag active" : "qa-tag"}
          onClick={() => setTag(null)}
        >
          {t.qa.all}
        </button>
        {QA_TAGS.map((tg) => (
          <button
            key={tg}
            className={tag === tg ? "qa-tag active" : "qa-tag"}
            onClick={() => setTag(tag === tg ? null : tg)}
          >
            {QA_TAG_LABELS[locale][tg]}
          </button>
        ))}
      </div>

      <div className="qa-list" data-testid="qa-list">
        {results.map((e) => (
          <article key={e.id} className="qa-card" data-testid="qa-card">
            <h3 className="qa-q">{e.q}</h3>
            <p className="qa-a">{e.a}</p>
            <div className="qa-card-tags">
              {e.tags.map((tg) => (
                <span key={tg} className="qa-card-tag">
                  {QA_TAG_LABELS[locale][tg]}
                </span>
              ))}
            </div>
          </article>
        ))}
        {results.length === 0 && (
          <div className="qa-empty" data-testid="qa-empty">
            {t.qa.empty(query, tag ? QA_TAG_LABELS[locale][tag] : null)}
          </div>
        )}
      </div>
    </>
  );
}

/** Flatten a ReactNode answer to plain text so search covers the answers. */function textOf(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  if (typeof node === "object" && "props" in (node as { props?: unknown })) {
    const el = node as { props?: { children?: React.ReactNode } };
    return textOf(el.props?.children);
  }
  return "";
}
