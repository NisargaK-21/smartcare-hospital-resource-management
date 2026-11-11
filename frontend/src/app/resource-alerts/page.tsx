"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import { fetchResourceAlerts } from "@/lib/api/resource-alerts";
import type { ResourceAlert } from "@/types/resource-alert";

function severityColor(severity: string): "red" | "amber" | "blue" | "gray" {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
      return "red";
    case "WARNING":
      return "amber";
    case "INFO":
    case "INFORMATIONAL":
      return "blue";
    default:
      return "gray";
  }
}

function relatedResource(alert: ResourceAlert) {
  const details = [];
  if (alert.bed_number) {
    details.push(`Bed ${alert.bed_number}${alert.bed_type ? ` (${alert.bed_type})` : ""}`);
  } else if (alert.resource_name) {
    details.push(`${alert.resource_name}${alert.resource_type ? ` (${alert.resource_type})` : ""}`);
  }
  if (alert.maintenance_id) details.push(`Maintenance #${alert.maintenance_id}`);
  if (alert.available_quantity !== undefined) {
    details.push(`${alert.available_quantity} available`);
  }
  return details.length ? details.join(" · ") : "Hospital resources";
}

export default function ResourceAlertsPage() {
  const [alerts, setAlerts] = useState<ResourceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setAlerts(await fetchResourceAlerts());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to fetch resource alerts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const severities = useMemo(
    () => [...new Set(alerts.map((alert) => alert.severity.toUpperCase()))],
    [alerts],
  );
  const filtered = alerts.filter((alert) => {
    if (severityFilter !== "ALL" && alert.severity.toUpperCase() !== severityFilter) return false;
    if (search) {
      const query = search.toLowerCase();
      return [
        alert.alert_type,
        alert.message,
        alert.resource_name,
        alert.resource_type,
        alert.bed_number,
        alert.bed_type,
        alert.maintenance_reason,
      ].some((value) => value?.toLowerCase().includes(query));
    }
    return true;
  });

  const counts = alerts.reduce<Record<string, number>>((result, alert) => {
    const severity = alert.severity.toUpperCase();
    result[severity] = (result[severity] ?? 0) + 1;
    return result;
  }, {});

  return (
    <div className="space-y-5">
      <PageHeader
        title="Resource Alerts"
        subtitle={`${alerts.length} alert${alerts.length === 1 ? "" : "s"}`}
        action={
          <button
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-200 disabled:opacity-50"
          >
            Refresh
          </button>
        }
      />

      <div className="flex flex-wrap gap-3">
        {severities.map((severity) => (
          <span
            key={severity}
            className={`rounded-full border px-3 py-1 text-xs font-bold ${
              severity === "CRITICAL"
                ? "border-rose-300 bg-rose-100 text-rose-900"
                : severity === "WARNING"
                  ? "border-amber-300 bg-amber-100 text-amber-900"
                  : "border-blue-300 bg-blue-100 text-blue-900"
            }`}
          >
            {severity}: {counts[severity]}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search alerts or related resource..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-72 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <select
          value={severityFilter}
          onChange={(event) => setSeverityFilter(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="ALL">All Severities</option>
          {severities.map((severity) => <option key={severity}>{severity}</option>)}
        </select>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center font-medium text-rose-700">
          {error}
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading resource alerts...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="font-semibold text-slate-800">
            {alerts.length === 0 ? "No resource alerts." : "No alerts match your filters."}
          </p>
          {alerts.length === 0 && (
            <p className="mt-1 text-sm text-slate-500">Resources and beds are currently operating without reported alerts.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert, index) => (
            <article
              key={`${alert.alert_type}-${alert.resource_id ?? alert.bed_id ?? alert.maintenance_id ?? index}`}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge color={severityColor(alert.severity)}>{alert.severity}</Badge>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{alert.alert_type}</span>
                </div>
                <p className="font-semibold text-slate-900">{alert.message}</p>
                <p className="mt-1 text-sm text-slate-600">{relatedResource(alert)}</p>
              </div>
              {alert.bed_status && <Badge>{alert.bed_status}</Badge>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
