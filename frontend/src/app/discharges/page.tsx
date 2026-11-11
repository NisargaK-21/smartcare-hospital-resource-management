"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import ActionError from "@/components/shared/ActionError";
import {
  fetchDischarges,
  createDischarge,
  completeDischarge,
  cancelDischarge,
} from "@/lib/api/discharges";
import { fetchAdmissions } from "@/lib/api/admissions";
import { fetchBeds } from "@/lib/api/beds";
import { fetchStaff } from "@/lib/api/staff";
import type { Discharge, DischargeStatus } from "@/types/discharge";
import type { Admission } from "@/types/admission";
import type { Bed } from "@/types/bed";
import type { Staff } from "@/types/staff";

const field =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "text-sm font-medium text-gray-700 mb-1 block";

const statusColor: Record<DischargeStatus, "amber" | "green" | "gray"> = {
  PENDING: "amber",
  COMPLETED: "green",
  CANCELLED: "gray",
};

const statusChipClass: Record<DischargeStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900 border-amber-300",
  COMPLETED: "bg-emerald-100 text-emerald-900 border-emerald-300",
  CANCELLED: "bg-slate-100 text-slate-800 border-slate-300",
};

const STATUSES: DischargeStatus[] = ["PENDING", "COMPLETED", "CANCELLED"];

function fmt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface FormState {
  admission_id: string;
  discharge_reason: string;
  discharged_by: string;
  notes: string;
}

export default function DischargesPage() {
  const [discharges, setDischarges] = useState<Discharge[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    admission_id: "",
    discharge_reason: "",
    discharged_by: "",
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
      const [d, a, s, b] = await Promise.all([
        fetchDischarges(),
        fetchAdmissions(),
        fetchStaff(),
        fetchBeds(),
      ]);
      setDischarges(d);
      setAdmissions(a);
      setStaff(s);
      setBeds(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load discharges.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Only ACTIVE admissions can be discharged
  const activeAdmissions = admissions.filter(
    (a) => a.admission_status === "ACTIVE"
  );

  const filtered = discharges.filter((d) => {
    if (statusFilter !== "ALL" && d.discharge_status !== statusFilter)
      return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !d.patient_name.toLowerCase().includes(q) &&
        !d.patient_number.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const counts = Object.fromEntries(
    STATUSES.map((s) => [
      s,
      discharges.filter((d) => d.discharge_status === s).length,
    ])
  ) as Record<DischargeStatus, number>;

  const openCreate = () => {
    setActionError("");
    setForm({
      admission_id: "",
      discharge_reason: "",
      discharged_by: "",
      notes: "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.admission_id || !form.discharge_reason.trim()) return;
    setSaving(true);
    setActionError("");
    try {
      await createDischarge({
        admission_id: Number(form.admission_id),
        discharge_reason: form.discharge_reason.trim(),
        discharged_by: form.discharged_by
          ? Number(form.discharged_by)
          : undefined,
        notes: form.notes.trim() || undefined,
      });
      showToast("Discharge initiated successfully");
      setModalOpen(false);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error creating discharge");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id: number) => {
    setBusyAction(`complete:${id}`);
    setActionError("");
    try {
      await completeDischarge(id);
      showToast("Discharge completed");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error completing discharge");
    } finally {
      setBusyAction(null);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm("Cancel this discharge?")) return;
    setBusyAction(`cancel:${id}`);
    setActionError("");
    try {
      await cancelDischarge(id);
      showToast("Discharge cancelled");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error cancelling discharge");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Discharges"
        subtitle={`${discharges.length} discharge record${discharges.length !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Initiate Discharge
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
            {s}: {counts[s]}
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="search"
          placeholder="Search patient or MRN…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">
            Loading discharges...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 font-medium">
            {error}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3">Patient</th>
                <th className="text-left px-4 py-3">MRN</th>
                <th className="text-left px-4 py-3">Admission ID</th>
                <th className="text-left px-4 py-3">Bed State</th>
                <th className="text-left px-4 py-3">Reason</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Discharge Date</th>
                <th className="text-left px-4 py-3">Notes</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-10 text-slate-500 font-medium"
                  >
                    No discharges found.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr
                    key={d.discharge_id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {d.patient_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 text-xs">
                      {d.patient_number}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-mono">
                      #{d.admission_id}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {(() => {
                        const bed = beds.find((item) => String(item.bed_id) === String(d.bed_id));
                        return bed ? (
                          <span className="font-medium text-slate-700">
                            {bed.bed_number} · {bed.bed_status}
                          </span>
                        ) : (
                          <span className="text-slate-400">{d.bed_id ? `Bed #${d.bed_id}` : "—"}</span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">
                      {d.discharge_reason}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={statusColor[d.discharge_status]}>
                        {d.discharge_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {fmt(d.discharge_date)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[160px] truncate">
                      {d.notes ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {d.discharge_status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleComplete(d.discharge_id)}
                              disabled={busyAction !== null}
                              className="border border-blue-500 text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-50"
                            >
                              {busyAction === `complete:${d.discharge_id}` ? "Completing..." : "Complete"}
                            </button>
                            <button
                              onClick={() => handleCancel(d.discharge_id)}
                              disabled={busyAction !== null}
                              className="border border-red-400 text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-50"
                            >
                              {busyAction === `cancel:${d.discharge_id}` ? "Cancelling..." : "Cancel"}
                            </button>
                          </>
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

      {/* Initiate Discharge Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-800">
              Initiate Discharge
            </h2>

            <div>
              <label className={lbl}>Active Admission *</label>
              <select
                required
                className={field}
                value={form.admission_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, admission_id: e.target.value }))
                }
              >
                <option value="">Select Active Admission</option>
                {activeAdmissions.map((a) => (
                  <option key={a.admission_id} value={a.admission_id}>
                    {a.patient_name} ({a.medical_record_number})
                    {a.bed_number ? ` — Bed ${a.bed_number}` : ""}
                  </option>
                ))}
              </select>
              {activeAdmissions.length === 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  No active admissions available for discharge.
                </p>
              )}
            </div>

            <div>
              <label className={lbl}>Discharge Reason *</label>
              <textarea
                required
                rows={3}
                className={field}
                value={form.discharge_reason}
                placeholder="Reason for discharge..."
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    discharge_reason: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label className={lbl}>Discharged By</label>
              <select
                className={field}
                value={form.discharged_by}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discharged_by: e.target.value }))
                }
              >
                <option value="">Select Staff (optional)</option>
                {staff.map((s) => (
                  <option key={s.staff_id} value={s.staff_id}>
                    {s.first_name} {s.last_name}
                    {s.designation ? ` — ${s.designation}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={lbl}>Notes</label>
              <textarea
                rows={2}
                className={field}
                value={form.notes}
                placeholder="Optional notes..."
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Initiating..." : "Initiate Discharge"}
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
