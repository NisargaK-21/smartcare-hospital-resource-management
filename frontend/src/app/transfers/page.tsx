"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import ActionError from "@/components/shared/ActionError";
import {
  fetchTransfers,
  createTransfer,
  completeTransfer,
  cancelTransfer,
} from "@/lib/api/transfers";
import { fetchAdmissions } from "@/lib/api/admissions";
import { fetchBeds } from "@/lib/api/beds";
import { fetchStaff } from "@/lib/api/staff";
import type { Transfer, TransferStatus } from "@/types/transfer";
import type { Admission } from "@/types/admission";
import type { Bed } from "@/types/bed";
import type { Staff } from "@/types/staff";

const field =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "text-sm font-medium text-gray-700 mb-1 block";

const statusColor: Record<TransferStatus, "amber" | "green" | "gray"> = {
  PENDING: "amber",
  COMPLETED: "green",
  CANCELLED: "gray",
};

const statusChipClass: Record<TransferStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900 border-amber-300",
  COMPLETED: "bg-emerald-100 text-emerald-900 border-emerald-300",
  CANCELLED: "bg-slate-100 text-slate-800 border-slate-300",
};

const STATUSES: TransferStatus[] = ["PENDING", "COMPLETED", "CANCELLED"];

function fmt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface FormState {
  admission_id: string;
  to_bed_id: string;
  transfer_reason: string;
  transferred_by: string;
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
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
    to_bed_id: "",
    transfer_reason: "",
    transferred_by: "",
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
      const [t, a, b, s] = await Promise.all([
        fetchTransfers(),
        fetchAdmissions(),
        fetchBeds({ is_active: "true" }),
        fetchStaff(),
      ]);
      setTransfers(t);
      setAdmissions(a);
      setBeds(b);
      setStaff(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transfers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Only ACTIVE admissions can be transferred
  const activeAdmissions = admissions.filter(
    (a) => a.admission_status === "ACTIVE" && a.bed_id !== null
  );

  const selectedAdmission = activeAdmissions.find(
    (admission) => String(admission.admission_id) === form.admission_id
  );
  const activeAdmissionBedIds = new Set(
    activeAdmissions.map((admission) => String(admission.bed_id))
  );
  const availableBeds = beds.filter(
    (bed) =>
      bed.is_active &&
      bed.bed_status === "AVAILABLE" &&
      String(bed.bed_id) !== String(selectedAdmission?.bed_id) &&
      !activeAdmissionBedIds.has(String(bed.bed_id))
  );

  const filtered = transfers.filter((t) => {
    if (statusFilter !== "ALL" && t.transfer_status !== statusFilter)
      return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !t.patient_name.toLowerCase().includes(q) &&
        !t.patient_number.toLowerCase().includes(q) &&
        !(t.to_bed_number ?? "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const counts = Object.fromEntries(
    STATUSES.map((s) => [
      s,
      transfers.filter((t) => t.transfer_status === s).length,
    ])
  ) as Record<TransferStatus, number>;

  const openCreate = () => {
    setActionError("");
    setForm({
      admission_id: "",
      to_bed_id: "",
      transfer_reason: "",
      transferred_by: "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.admission_id || !form.to_bed_id || !form.transfer_reason.trim()) return;
    setSaving(true);
    setActionError("");
    try {
      await createTransfer({
        admission_id: Number(form.admission_id),
        to_bed_id: Number(form.to_bed_id),
        transfer_reason: form.transfer_reason.trim(),
        transferred_by: form.transferred_by
          ? Number(form.transferred_by)
          : undefined,
      });
      showToast("Transfer created successfully");
      setModalOpen(false);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error creating transfer");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id: number) => {
    setBusyAction(`complete:${id}`);
    setActionError("");
    try {
      await completeTransfer(id);
      showToast("Transfer completed");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error completing transfer");
    } finally {
      setBusyAction(null);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm("Cancel this transfer?")) return;
    setBusyAction(`cancel:${id}`);
    setActionError("");
    try {
      await cancelTransfer(id);
      showToast("Transfer cancelled");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error cancelling transfer");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Patient Transfers"
        subtitle={`${transfers.length} transfer${transfers.length !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Create Transfer
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
          placeholder="Search patient or bed…"
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
            Loading transfers...
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
                <th className="text-left px-4 py-3">From Bed</th>
                <th className="text-left px-4 py-3">To Bed</th>
                <th className="text-left px-4 py-3">Reason</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Transfer Date</th>
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
                    No transfers found.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.transfer_id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {t.patient_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 text-xs">
                      {t.patient_number}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-medium">
                      {t.from_bed_number ? (
                        <>
                          {t.from_bed_number}
                          {t.from_bed_type ? (
                            <span className="text-slate-400">
                              {" "}
                              ({t.from_bed_type})
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {t.to_bed_number}
                      {t.to_bed_type ? (
                        <span className="text-slate-400 font-normal text-xs">
                          {" "}
                          ({t.to_bed_type})
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">
                      {t.transfer_reason}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={statusColor[t.transfer_status]}>
                        {t.transfer_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {fmt(t.transfer_date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {t.transfer_status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleComplete(t.transfer_id)}
                              disabled={busyAction !== null}
                              className="border border-blue-500 text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-50"
                            >
                              {busyAction === `complete:${t.transfer_id}` ? "Completing..." : "Complete"}
                            </button>
                            <button
                              onClick={() => handleCancel(t.transfer_id)}
                              disabled={busyAction !== null}
                              className="border border-red-400 text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-50"
                            >
                              {busyAction === `cancel:${t.transfer_id}` ? "Cancelling..." : "Cancel"}
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

      {/* Create Transfer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-800">
              Create Patient Transfer
            </h2>

            <div>
              <label className={lbl}>Active Admission *</label>
              <select
                required
                className={field}
                value={form.admission_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    admission_id: e.target.value,
                    to_bed_id: "",
                  }))
                }
              >
                <option value="">Select Active Admission</option>
                {activeAdmissions.map((a) => (
                  <option key={a.admission_id} value={a.admission_id}>
                    {a.patient_name} ({a.medical_record_number})
                    {a.bed_number ? ` — Bed ${a.bed_number}` : " — No bed"}
                  </option>
                ))}
              </select>
              {activeAdmissions.length === 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  No active admissions available for transfer.
                </p>
              )}
            </div>

            <div>
              <label className={lbl}>Destination Bed *</label>
              <select
                required
                className={field}
                value={form.to_bed_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, to_bed_id: e.target.value }))
                }
              >
                <option value="">Select Available Bed</option>
                {availableBeds.map((b) => (
                  <option key={b.bed_id} value={b.bed_id}>
                    {b.bed_number} — {b.bed_type}
                    {b.ward_name ? ` (${b.ward_name})` : ""}
                  </option>
                ))}
              </select>
              {availableBeds.length === 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  No available beds at this time.
                </p>
              )}
            </div>

            <div>
              <label className={lbl}>Transfer Reason *</label>
              <textarea
                required
                rows={3}
                className={field}
                value={form.transfer_reason}
                placeholder="Reason for transfer..."
                onChange={(e) =>
                  setForm((f) => ({ ...f, transfer_reason: e.target.value }))
                }
              />
            </div>

            <div>
              <label className={lbl}>Transferred By</label>
              <select
                className={field}
                value={form.transferred_by}
                onChange={(e) =>
                  setForm((f) => ({ ...f, transferred_by: e.target.value }))
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

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Transfer"}
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
