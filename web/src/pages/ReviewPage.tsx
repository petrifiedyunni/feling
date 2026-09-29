import { useEffect, useMemo, useState } from "react";
import { formatPrice, type PendingItem } from "../types";

type SortKey = "taste" | "heat" | "price";

async function fetchPending(): Promise<PendingItem[]> {
  const res = await fetch("/api/pending", { credentials: "include" });
  if (!res.ok) throw new Error(`GET /api/pending failed: ${res.status}`);
  return res.json();
}

async function decide(uid: string, action: "approve" | "skip") {
  const res = await fetch(`/api/pending/${encodeURIComponent(uid)}/${action}`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`${action} failed: ${res.status}`);
  return res.json();
}

async function dedupePending(): Promise<{ removed: number; kept: number }> {
  const res = await fetch("/api/pending/dedupe", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`dedupe failed: ${res.status}`);
  return res.json();
}

export function ReviewPage() {
  const [items, setItems] = useState<PendingItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("taste");
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [dedupeStatus, setDedupeStatus] = useState<string | null>(null);
  const [dedupeBusy, setDedupeBusy] = useState(false);

  function reload() {
    fetchPending()
      .then(setItems)
      .catch(() => setError("Couldn't load the pending queue."));
  }

  useEffect(reload, []);

  async function onDedupe() {
    setDedupeBusy(true);
    setDedupeStatus(null);
    try {
      const { removed } = await dedupePending();
      setDedupeStatus(
        removed
          ? `Removed ${removed} near-duplicate${removed === 1 ? "" : "s"}.`
          : "No near-duplicates found."
      );
      reload();
    } catch {
      setDedupeStatus("Cleanup failed — try again.");
    } finally {
      setDedupeBusy(false);
    }
  }

  const sorted = useMemo(() => {
    if (!items) return [];
    return [...items].sort((a, b) => Number(b[sort] || 0) - Number(a[sort] || 0));
  }, [items, sort]);

  async function onDecide(uid: string, action: "approve" | "skip") {
    setBusyUid(uid);
    const prev = items;
    setItems((cur) => (cur ? cur.filter((i) => i.uid !== uid) : cur));
    try {
      await decide(uid, action);
    } catch {
      setError(`Failed to ${action} that item — restored to the queue.`);
      setItems(prev ?? null);
    } finally {
      setBusyUid(null);
    }
  }

  if (!items) {
    return (
      <div className="ops">
        <h1>Review queue</h1>
        <p>{error || "Loading…"}</p>
      </div>
    );
  }

  return (
    <div className="ops">
      <header className="ops__head">
        <h1>Review queue</h1>
        <p className="ops__hint">
          {items.length} item(s) pending.
          {dedupeStatus && <span className="ops__meta"> {dedupeStatus}</span>}
        </p>
      </header>

      <div className="ops__filters">
        {(["taste", "heat", "price"] as SortKey[]).map((key) => (
          <button
            key={key}
            type="button"
            className={sort === key ? "is-active" : ""}
            onClick={() => setSort(key)}
          >
            Sort: {key}
          </button>
        ))}
        <button type="button" onClick={onDedupe} disabled={dedupeBusy}>
          {dedupeBusy ? "Cleaning up…" : "Clean up duplicates"}
        </button>
      </div>

      {error && <p className="ops__error">{error}</p>}

      <div className="review__grid">
        {sorted.map((item) => (
          <div
            key={item.uid}
            className={`review__card ${busyUid === item.uid ? "is-saving" : ""}`}
          >
            <a href={item.url} target="_blank" rel="noreferrer" className="review__media">
              {item.photo && <img src={item.photo} alt={item.title} loading="lazy" />}
            </a>
            <div className="review__meta">
              <strong>{item.brand}</strong>
              <span>{item.title.slice(0, 70)}</span>
              <span className="review__price">{formatPrice(item.price)}</span>
              <span className="ops__meta">
                {item.platform} · {item.region_label || item.region || ""} · taste{" "}
                {Math.round(item.taste || 0)}
              </span>
            </div>
            <div className="review__actions">
              <button
                type="button"
                className="review__approve"
                disabled={busyUid === item.uid}
                onClick={() => onDecide(item.uid, "approve")}
              >
                Approve
              </button>
              <button
                type="button"
                className="review__skip"
                disabled={busyUid === item.uid}
                onClick={() => onDecide(item.uid, "skip")}
              >
                Skip
              </button>
            </div>
          </div>
        ))}
        {!sorted.length && <p className="ops__empty">Queue is empty.</p>}
      </div>
    </div>
  );
}
