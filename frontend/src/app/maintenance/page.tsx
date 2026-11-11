"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import ActionError from "@/components/shared/ActionError";
import {
  fetchMaintenance,
  createMaintenance,
  startMaintenance,
  completeMaintenance,
  cancelMaintenance,
} from "@/lib/api/maintenance";
import { fetchAdmissions } from "@/lib/api/admissions";
import { fetchBeds } from "@/lib/api/beds";
import { fetchIcuResources } from "@/lib/api/icu-resources";
import type { MaintenanceRecord, MaintenanceStatus } from "@/types/maintenance";
import type { Admission } from "@/types/admission";
import type { Bed } from "@/types/bed";
import type { IcuResource } from "@/types/icu-resource";

const field =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "text-sm font-medium text-gray-700 mb-1 block";

const statusColor: Record<
  MaintenanceStatus,
  "amber" | "blue" | "green" | "gray"
> = {
  PENDING: "amber",
  IN_PROGRESS: "blue",
  COMPLETED: "green",
  CANCELLED: "gray",
};

const statusChipClass: Record<MaintenanceStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900 border-amber-300",
  IN_PROGRESS: "bg-blue-100 text-blue-900 border-blue-300",
  COMPLETED: "bg-emerald-100 text-emerald-900 border-emerald-300",
  CANCELLED: "bg-slate-100 text-slate-800 border-slate-300",
};

const STATUSES: MaintenanceStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

function fmt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type TargetType = "bed" | "icu_resource";

interface FormState {
  target_type: TargetType;
  bed_id: string;
  icu_resource_id: string;
  maintenance_reason: string;
  notes: string;
}

export default function MaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [resources, setResources] = useState<IcuResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [targetFilter, setTargetFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    target_type: "bed",
    bed_id: "",
    icu_resource_id: "",
    maintenance_reason: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [m, a, b, r] = await Promise.all([
        fetchMaintenance(),
        fetchAdmissions(),
        fetchBeds({ is_active: "true" }),
        fetchIcuResources(),
      ]);
      setRecords(m);
      setAdmissions(a);
      setBeds(b);
      setResources(r);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load maintenance records."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeAdmissionBedIds = new Set(
    admissions
      .filter((admission) => admission.admission_status === "ACTIVE" && admission.bed_id !== null)
      .map((admission) => String(admission.bed_id))
  );
  const availableBeds = beds.filter(
    (bed) =>
      bed.is_active &&
      bed.bed_status === "AVAILABLE" &&
      !activeAdmissionBedIds.has(String(bed.bed_id))
  );
  const availableResources = resources.filter(
    (resource) => resource.resource_status === "AVAILABLE"
  );

  const filtered = records.filter((r) => {
    if (statusFilter !== "ALL" && r.maintenance_status !== statusFilter)
      return false;
    if (targetFilter === "beds" && !r.bed_id) return false;
    if (targetFilter === "resources" && !r.icu_resource_id) return false;
    if (search) {
      const q = search.toLowerCase();
      const inBed = (r.bed_number ?? "").toLowerCase().includes(q);
      const inResource = (r.resource_name ?? "").toLowerCase().includes(q);
      const inReason = r.maintenance_reason.toLowerCase().includes(q);
      if (!inBed && !inResource && !inReason) return false;
    }
    return true;
  });

  const counts = Object.fromEntries(
    STATUSES.map((s) => [
      s,
      records.filter((r) => r.maintenance_status === s).length,
    ])
  ) as Record<MaintenanceStatus, number>;

  const openCreate = () => {
    setActionError("");
    setForm({
      target_type: "bed",
      bed_id: "",
      icu_resource_id: "",
      maintenance_reason: "",
      notes: "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.maintenance_reason.trim()) return;
    if (form.target_type === "bed" && !form.bed_id) return;
    if (form.target_type === "icu_resource" && !form.icu_resource_id) return;
    setSaving(true);
    setActionError("");
    try {
      await createMaintenance({
        bed_id:
          form.target_type === "bed" && form.bed_id
            ? Number(form.bed_id)
            : undefined,
        icu_resource_id:
          form.target_type === "icu_resource" && form.icu_resource_id
            ? Number(form.icu_resource_id)
            : undefined,
        maintenance_reason: form.maintenance_reason.trim(),
        notes: form.notes.trim() || undefined,
      });
      showToast("Maintenance record created");
      setModalOpen(false);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error creating maintenance record");
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (id: number) => {
    setBusyAction(`start:${id}`);
    setActionError("");
    try {
      await startMaintenance(id);
      showToast("Maintenance started");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error starting maintenance");
    } finally {
      setBusyAction(null);
    }
  };

  const handleComplete = async (id: number) => {
    setBusyAction(`complete:${id}`);
    setActionError("");
    try {
      await completeMaintenance(id);
      showToast("Maintenance completed");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error completing maintenance");
    } finally {
      setBusyAction(null);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm("Cancel this maintenance record?")) return;
    setBusyAction(`cancel:${id}`);
    setActionError("");
    try {
      await cancelMaintenance(id);
      showToast("Maintenance cancelled");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error cancelling maintenance");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Maintenance Management"
        subtitle={`${records.length} maintenance record${records.length !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Log Maintenance
          </button>
        }
      />
      <ActionError message={actionError} />

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        {STATUSES.map((s) => (
          <span
            key={s}
            className={`px-3 py-1 rounded-full text-xs font-bold border ${statusChipClass[s]}`}
          >
            {s.replace("_", " ")}: {counts[s]}
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="search"
          placeholder="Search bed, resource, or reason…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={targetFilter}
          onChange={(e) => setTargetFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Target Types</option>
          <option value="beds">Beds Only</option>
          <option value="resources">ICU Resources Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">
            Loading maintenance records...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 font-medium">
            {error}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3">Target</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Reason</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Started</th>
                <th className="text-left px-4 py-3">Completed</th>
                <th className="text-left px-4 py-3">Notes</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-10 text-slate-500 font-medium"
                  >
                    No maintenance records found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.maintenance_id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {r.bed_id ? (
                        <>
                          🛏️ {r.bed_number}
                        </>
                      ) : r.icu_resource_id ? (
                        <>
                          🫁 {r.resource_name}
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-medium">
                      {r.bed_id
                        ? r.bed_type
                        : r.icu_resource_id
                        ? r.resource_type
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">
                      {r.maintenance_reason}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={statusColor[r.maintenance_status]}>
                        {r.maintenance_status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {fmt(r.maintenance_start)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {fmt(r.maintenance_completed_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[140px] truncate">
                      {r.notes ?? (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {r.maintenance_status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleStart(r.maintenance_id)}
                              disabled={busyAction !== null}
                              className="border border-blue-500 text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-50"
                            >
                              {busyAction === `start:${r.maintenance_id}` ? "Starting..." : "Start"}
                            </button>
                            <button
                              onClick={() => handleCancel(r.maintenance_id)}
                              disabled={busyAction !== null}
                              className="border border-red-400 text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-50"
                            >
                              {busyAction === `cancel:${r.maintenance_id}` ? "Cancelling..." : "Cancel"}
                            </button>
                          </>
                        )}
                        {r.maintenance_status === "IN_PROGRESS" && (
                          <button
                            onClick={() => handleComplete(r.maintenance_id)}
                            disabled={busyAction !== null}
                            className="border border-emerald-500 text-emerald-700 hover:bg-emerald-50 px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-50"
                          >
                            {busyAction === `complete:${r.maintenance_id}` ? "Completing..." : "Complete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Log Maintenance Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-800">
              Log Maintenance
            </h2>

            <div>
              <label className={lbl}>Target Type *</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="target_type"
                    value="bed"
                    checked={form.target_type === "bed"}
                    onChange={() =>
                      setForm((f) => ({
                        ...f,
                        target_type: "bed",
                        icu_resource_id: "",
                      }))
                    }
                  />
                  Bed
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="target_type"
                    value="icu_resource"
                    checked={form.target_type === "icu_resource"}
                    onChange={() =>
                      setForm((f) => ({
                        ...f,
                        target_type: "icu_resource",
                        bed_id: "",
                      }))
                    }
                  />
                  ICU Resource
                </label>
              </div>
            </div>

            {form.target_type === "bed" ? (
              <div>
                <label className={lbl}>Bed *</label>
                <select
                  required
                  className={field}
                  value={form.bed_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bed_id: e.target.value }))
                  }
                >
                  <option value="">Select Bed</option>
                  {availableBeds.map((b) => (
                    <option key={b.bed_id} value={b.bed_id}>
                      {b.bed_number} — {b.bed_type}
                      {b.ward_name ? ` (${b.ward_name})` : ""} [{b.bed_status}]
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className={lbl}>ICU Resource *</label>
                {availableResources.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    No available ICU resources can be placed into maintenance.
                  </p>
                ) : (
                  <select
                    required
                    className={field}
                    value={form.icu_resource_id}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        icu_resource_id: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select ICU Resource</option>
                    {availableResources.map((r) => (
                      <option
                        key={r.icu_resource_id}
                        value={r.icu_resource_id}
                      >
                        {r.resource_name} — {r.resource_type} [{r.resource_status}]
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div>
              <label className={lbl}>Maintenance Reason *</label>
              <textarea
                required
                rows={3}
                className={field}
                value={form.maintenance_reason}
                placeholder="Describe the maintenance reason..."
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    maintenance_reason: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label className={lbl}>Notes</label>
              <textarea
                rows={2}
                className={field}
                value={form.notes}
                placeholder="Optional additional notes..."
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={
                  saving ||
                  (form.target_type === "bed" && availableBeds.length === 0) ||
                  (form.target_type === "icu_resource" && availableResources.length === 0)
                }
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving..." : "Log Maintenance"}
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
