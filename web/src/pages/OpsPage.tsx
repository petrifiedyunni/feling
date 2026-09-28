import { useEffect, useMemo, useState } from "react";
import {
  INVENTORY_STATUSES,
  STATUS_LABEL,
  formatPrice,
  type InventoryItem,
  type InventoryStatus,
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

  async function update(uid: string, patch: Partial<InventoryItem>) {
    setItems((prev) =>
      prev ? prev.map((i) => (i.uid === uid ? { ...i, ...patch } : i)) : prev
    );
    setSavingUid(uid);
    try {
      const updated = await patchInventory(uid, patch);
      setItems((prev) =>
        prev ? prev.map((i) => (i.uid === uid ? { ...i, ...updated } : i)) : prev
      );
    } catch {
      setError(`Save failed for ${uid} — try again.`);
    } finally {
      setSavingUid(null);
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

      <div className="ops__filters">
        <button
          type="button"
          className={filter === "all" ? "is-active" : ""}
          onClick={() => setFilter("all")}
        >
          All ({items.length})
        </button>
        {INVENTORY_STATUSES.map((s) => {
          const count = items.filter((i) => i.status === s).length;
          if (!count) return null;
          return (
            <button
              key={s}
              type="button"
              className={filter === s ? "is-active" : ""}
              onClick={() => setFilter(s)}
            >
              {STATUS_LABEL[s]} ({count})
            </button>
          );
        })}
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
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {item.brand} — {item.title.slice(0, 60)}
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
                  <td>
                    <input
                      type="number"
                      placeholder="—"
                      defaultValue={item.resale_price ?? ""}
                      onBlur={(e) =>
                        update(item.uid, {
                          resale_price: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
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
