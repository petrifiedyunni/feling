import { useEffect, useMemo, useState } from "react";
import {
  INVENTORY_STATUSES,
  STATUS_LABEL,
  formatPrice,
  type InventoryItem,
  type InventoryStatus,
  type PriceSuggestion,
} from "../types";
import { useAuth } from "../auth/AuthContext";

const API = "/api/inventory";

async function fetchInventory(): Promise<InventoryItem[]> {
  const res = await fetch(API, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${API} failed: ${res.status}`);
  return res.json();
}

async function patchInventory(uid: string, patch: Partial<InventoryItem>) {
  const res = await fetch(`${API}/${encodeURIComponent(uid)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH ${API} failed: ${res.status}`);
  return (await res.json()) as InventoryItem;
}

async function fetchPriceSuggestion(uid: string): Promise<PriceSuggestion> {
  const res = await fetch(`${API}/${encodeURIComponent(uid)}/price-suggestion`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`price-suggestion failed: ${res.status}`);
  return res.json();
}

function margin(item: InventoryItem): number | null {
  if (item.status !== "sold" || item.sold_price == null) return null;
  return item.sold_price - item.cost;
}

export function OpsPage() {
  const { user, logout } = useAuth();
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [filter, setFilter] = useState<InventoryStatus | "all">("all");
  const [suggestions, setSuggestions] = useState<
    Record<string, { loading: boolean; data?: PriceSuggestion; error?: string }>
  >({});

  useEffect(() => {
    fetchInventory()
      .then(setItems)
      .catch(() => setError("Couldn't load inventory — try refreshing."));
  }, []);

  const list = useMemo(() => {
    if (!items) return [];
    const sorted = [...items].sort((a, b) =>
      String(b.approved_at || "").localeCompare(String(a.approved_at || ""))
    );
    return filter === "all" ? sorted : sorted.filter((i) => i.status === filter);
  }, [items, filter]);

  const totals = useMemo(() => {
    if (!items) return { cost: 0, revenue: 0, margin: 0, soldCount: 0 };
    let cost = 0;
    let revenue = 0;
    let marginSum = 0;
    let soldCount = 0;
    for (const i of items) {
      cost += i.cost || 0;
      if (i.status === "sold" && i.sold_price != null) {
        revenue += i.sold_price;
        marginSum += i.sold_price - i.cost;
        soldCount += 1;
      }
    }
    return { cost, revenue, margin: marginSum, soldCount };
  }, [items]);

  const stageBreakdown = useMemo(() => {
    if (!items) return [];
    return INVENTORY_STATUSES.map((status) => {
      const matching = items.filter((i) => i.status === status);
      return {
        status,
        count: matching.length,
        cost: matching.reduce((sum, i) => sum + (i.cost || 0), 0),
      };
    }).filter((row) => row.count > 0);
  }, [items]);

  async function update(uid: string, patch: Partial<InventoryItem>) {
    const before = items?.find((i) => i.uid === uid);
    setItems((prev) =>
      prev ? prev.map((i) => (i.uid === uid ? { ...i, ...patch } : i)) : prev
    );
    setSavingUid(uid);
    try {
      const updated = await patchInventory(uid, patch);
      setItems((prev) =>
        prev ? prev.map((i) => (i.uid === uid ? { ...i, ...updated } : i)) : prev
      );
      // The moment an item reaches "photographed" is the natural point you'd
      // start pricing it — auto-suggest then, instead of for the whole
      // approved backlog (each suggestion is a live comp search).
      if (
        patch.status === "photographed" &&
        before?.status !== "photographed" &&
        !updated.resale_price &&
        !suggestions[uid]
      ) {
        suggestPrice(uid);
      }
    } catch {
      setError(`Save failed for ${uid} — try again.`);
    } finally {
      setSavingUid(null);
    }
  }

  async function suggestPrice(uid: string) {
    setSuggestions((prev) => ({ ...prev, [uid]: { loading: true } }));
    try {
      const data = await fetchPriceSuggestion(uid);
      setSuggestions((prev) => ({ ...prev, [uid]: { loading: false, data } }));
    } catch {
      setSuggestions((prev) => ({
        ...prev,
        [uid]: { loading: false, error: "Comp search failed — try again." },
      }));
    }
  }

  if (error && !items) {
    return (
      <div className="ops ops--error">
        <h1>Inventory ops</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!items) {
    return (
      <div className="ops">
        <h1>Inventory ops</h1>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="ops">
      <header className="ops__head">
        <h1>Inventory ops</h1>
        <p className="ops__hint">
          Signed in as {user?.username}. Only items marked &ldquo;Listed&rdquo; or
          &ldquo;Sold&rdquo; appear in the shop.{" "}
          <a className="ops__link" href="/review">
            Review queue
          </a>{" "}
          ·{" "}
          <button type="button" className="ops__link" onClick={logout}>
            Log out
          </button>
        </p>
      </header>

      <div className="ops__stats">
        <div>
          <span>Total cost (all approved)</span>
          <strong>{formatPrice(totals.cost)}</strong>
        </div>
        <div>
          <span>Revenue ({totals.soldCount} sold)</span>
          <strong>{formatPrice(totals.revenue)}</strong>
        </div>
        <div>
          <span>Realized margin</span>
          <strong className={totals.margin >= 0 ? "ops__pos" : "ops__neg"}>
            {formatPrice(totals.margin)}
          </strong>
        </div>
      </div>

      <h2 className="ops__section-title">Pipeline — where everything sits right now</h2>
      <div className="ops__breakdown">
        <button
          type="button"
          className={`ops__stage-card ${filter === "all" ? "is-active" : ""}`}
          onClick={() => setFilter("all")}
        >
          <span className="ops__stage-label">All</span>
          <strong>{items.length}</strong>
          <span className="ops__meta">{formatPrice(totals.cost)}</span>
        </button>
        {stageBreakdown.map(({ status, count, cost }) => (
          <button
            key={status}
            type="button"
            className={`ops__stage-card ${filter === status ? "is-active" : ""}`}
            onClick={() => setFilter(status)}
          >
            <span className="ops__stage-label">{STATUS_LABEL[status]}</span>
            <strong>{count}</strong>
            <span className="ops__meta">{formatPrice(cost)}</span>
          </button>
        ))}
      </div>

      {error && <p className="ops__error">{error}</p>}

      <div className="ops__table-wrap">
        <table className="ops__table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Cost</th>
              <th>Status</th>
              <th>Resale price</th>
              <th>Sold price</th>
              <th>Channel</th>
              <th>Margin</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {list.map((item) => {
              const m = margin(item);
              return (
                <tr key={item.uid} className={savingUid === item.uid ? "is-saving" : ""}>
                  <td className="ops__item">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ops__item-link"
                    >
                      {item.photo && (
                        <img
                          src={item.photo}
                          alt=""
                          className="ops__thumb"
                          loading="lazy"
                        />
                      )}
                      <span className="ops__item-text">
                        <strong>{item.brand}</strong> — {item.title.slice(0, 60)}
                      </span>
                    </a>
                    <span className="ops__meta">
                      {item.platform} · approved {(item.approved_at || "").slice(0, 10)}
                    </span>
                  </td>
                  <td>{formatPrice(item.cost)}</td>
                  <td>
                    <select
                      value={item.status}
                      onChange={(e) =>
                        update(item.uid, {
                          status: e.target.value as InventoryStatus,
                          ...(e.target.value === "purchased" && !item.purchased_at
                            ? { purchased_at: new Date().toISOString() }
                            : {}),
                          ...(e.target.value === "received" && !item.received_at
                            ? { received_at: new Date().toISOString() }
                            : {}),
                          ...(e.target.value === "listed" && !item.listed_at
                            ? { listed_at: new Date().toISOString() }
                            : {}),
                          ...(e.target.value === "sold" && !item.sold_at
                            ? { sold_at: new Date().toISOString() }
                            : {}),
                        })
                      }
                    >
                      {INVENTORY_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="ops__price-cell">
                    <input
                      key={item.resale_price ?? "empty"}
                      type="number"
                      placeholder="—"
                      defaultValue={item.resale_price ?? ""}
                      onBlur={(e) =>
                        update(item.uid, {
                          resale_price: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                    {(() => {
                      const sug = suggestions[item.uid];
                      if (!sug) {
                        return (
                          <button
                            type="button"
                            className="ops__suggest-btn"
                            onClick={() => suggestPrice(item.uid)}
                          >
                            Suggest
                          </button>
                        );
                      }
                      if (sug.loading) {
                        return <span className="ops__meta">Searching comps…</span>;
                      }
                      if (sug.error) {
                        return <span className="ops__meta">{sug.error}</span>;
                      }
                      if (!sug.data?.suggestion) {
                        return <span className="ops__meta">No close comps found.</span>;
                      }
                      const { median, low, high, sample_size } = sug.data.suggestion;
                      return (
                        <div className="ops__suggestion">
                          <span className="ops__meta">
                            {formatPrice(low)}–{formatPrice(high)} · {sample_size} comp
                            {sample_size === 1 ? "" : "s"}
                          </span>
                          <button
                            type="button"
                            className="ops__suggest-btn"
                            onClick={() => update(item.uid, { resale_price: median })}
                          >
                            Use {formatPrice(median)}
                          </button>
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    <input
                      type="number"
                      placeholder="—"
                      defaultValue={item.sold_price ?? ""}
                      onBlur={(e) =>
                        update(item.uid, {
                          sold_price: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Instagram, Grailed…"
                      defaultValue={item.listed_channels ?? ""}
                      onBlur={(e) =>
                        update(item.uid, { listed_channels: e.target.value })
                      }
                    />
                  </td>
                  <td className={m == null ? "" : m >= 0 ? "ops__pos" : "ops__neg"}>
                    {m == null ? "—" : formatPrice(m)}
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Notes"
                      defaultValue={item.notes ?? ""}
                      onBlur={(e) => update(item.uid, { notes: e.target.value })}
                    />
                  </td>
                </tr>
              );
            })}
            {!list.length && (
              <tr>
                <td colSpan={8} className="ops__empty">
                  No items in this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
