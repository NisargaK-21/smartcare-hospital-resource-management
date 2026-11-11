"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import ActionError from "@/components/shared/ActionError";
import {
  fetchReservations,
  createReservation,
  confirmReservation,
  cancelReservation,
  completeReservation,
  expireReservation,
} from "@/lib/api/reservations";
import { fetchAdmissions } from "@/lib/api/admissions";
import { fetchPatients } from "@/lib/api/patients";
import { fetchBeds } from "@/lib/api/beds";
import { fetchStaff } from "@/lib/api/staff";
import type { Reservation, ReservationStatus } from "@/types/reservation";
import type { Admission } from "@/types/admission";
import type { Patient } from "@/types/patient";
import type { Bed } from "@/types/bed";
import type { Staff } from "@/types/staff";

const field =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "text-sm font-medium text-gray-700 mb-1 block";

const statusBadgeColor: Record<
  ReservationStatus,
  "amber" | "green" | "gray" | "blue" | "red"
> = {
  PENDING: "amber",
  CONFIRMED: "green",
  CANCELLED: "gray",
  COMPLETED: "blue",
  EXPIRED: "red",
};

const statusChipClass: Record<ReservationStatus, string> = {
  PENDING:
    "bg-amber-100 text-amber-900 border-amber-300",
  CONFIRMED:
    "bg-emerald-100 text-emerald-900 border-emerald-300",
  CANCELLED:
    "bg-slate-100 text-slate-800 border-slate-300",
  COMPLETED:
    "bg-blue-100 text-blue-900 border-blue-300",
  EXPIRED:
    "bg-rose-100 text-rose-900 border-rose-300",
};

const STATUSES: ReservationStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "EXPIRED",
];

function fmt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    patient_id: "",
    bed_id: "",
    reservation_start: "",
    reservation_end: "",
    reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [r, a, p, b, s] = await Promise.all([
        fetchReservations(),
        fetchAdmissions(),
        fetchPatients(),
        fetchBeds({ is_active: "true" }),
        fetchStaff(),
      ]);
      setReservations(r);
      setAdmissions(a);
      setPatients(p);
      setBeds(b);
      setStaff(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Build staff map for display
  const staffMap = new Map(
    staff.map((s) => [s.staff_id, `${s.first_name} ${s.last_name}`])
  );

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

  // Filter & search
  const filtered = reservations.filter((r) => {
    if (statusFilter !== "ALL" && r.reservation_status !== statusFilter)
      return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !r.patient_name.toLowerCase().includes(q) &&
        !r.bed_number.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  // Counts per status (across all, not filtered)
  const counts = Object.fromEntries(
    STATUSES.map((s) => [
      s,
      reservations.filter((r) => r.reservation_status === s).length,
    ])
  ) as Record<ReservationStatus, number>;

  const openCreate = () => {
    setActionError("");
    setForm({
      patient_id: "",
      bed_id: "",
      reservation_start: "",
      reservation_end: "",
      reason: "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    if (
      form.reservation_end &&
      Date.parse(form.reservation_end) <= Date.parse(form.reservation_start)
    ) {
      setActionError("Reservation end must be later than the start.");
      return;
    }
    setSaving(true);
    try {
      await createReservation({
        patient_id: Number(form.patient_id),
        bed_id: Number(form.bed_id),
        reservation_start: form.reservation_start,
        reservation_end: form.reservation_end || undefined,
        reason: form.reason || undefined,
      });
      showToast("Reservation created");
      setModalOpen(false);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error creating reservation");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async (id: number) => {
    setBusyAction(`confirm:${id}`);
    setActionError("");
    try {
      await confirmReservation(id);
      showToast("Reservation confirmed");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error confirming reservation");
    } finally {
      setBusyAction(null);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm("Cancel this reservation?")) return;
    setBusyAction(`cancel:${id}`);
    setActionError("");
    try {
      await cancelReservation(id);
      showToast("Reservation cancelled");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error cancelling reservation");
    } finally {
      setBusyAction(null);
    }
  };

  const handleComplete = async (id: number) => {
    setBusyAction(`complete:${id}`);
    setActionError("");
    try {
      await completeReservation(id);
      showToast("Reservation completed");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error completing reservation");
    } finally {
      setBusyAction(null);
    }
  };

  const handleExpire = async (id: number) => {
    if (!window.confirm("Expire this reservation?")) return;
    setBusyAction(`expire:${id}`);
    setActionError("");
    try {
      await expireReservation(id);
      showToast("Reservation expired");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error expiring reservation");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bed Reservations"
        subtitle={`${reservations.length} reservation${reservations.length !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={openCreate}
            disabled={availableBeds.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Create Reservation
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
        <input
          type="search"
          placeholder="Search patient or bed…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
        />
      </div>
      {availableBeds.length === 0 && (
        <p className="text-sm font-medium text-amber-800">
          No active beds with AVAILABLE status can be reserved right now.
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">
            Loading reservations...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 font-medium">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3">Patient</th>
                <th className="text-left px-4 py-3">MRN</th>
                <th className="text-left px-4 py-3">Bed</th>
                <th className="text-left px-4 py-3">Bed Type</th>
                <th className="text-left px-4 py-3">Start Date</th>
                <th className="text-left px-4 py-3">End Date</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Reserved By</th>
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
                    No reservations match the selected filters
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.reservation_id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {r.patient_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                      {r.patient_number}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {r.bed_number}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-medium">
                      {r.bed_type}
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs">
                      {fmt(r.reservation_start)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs">
                      {fmt(r.reservation_end)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={statusBadgeColor[r.reservation_status]}>
                        {r.reservation_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {r.reserved_by != null
                        ? staffMap.get(r.reserved_by) ?? `#${r.reserved_by}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {r.reservation_status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleConfirm(r.reservation_id)}
                              disabled={busyAction !== null}
                              className="border border-blue-500 text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-50"
                            >
                              {busyAction === `confirm:${r.reservation_id}` ? "Confirming..." : "Confirm"}
                            </button>
                            <button
                              onClick={() => handleCancel(r.reservation_id)}
                              disabled={busyAction !== null}
                              className="border border-red-400 text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-50"
                            >
                              {busyAction === `cancel:${r.reservation_id}` ? "Cancelling..." : "Cancel"}
                            </button>
                          </>
                        )}
                        {r.reservation_status === "CONFIRMED" && (
                          <>
                            <button
                              onClick={() => handleComplete(r.reservation_id)}
                              disabled={busyAction !== null}
                              className="border border-blue-500 text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-50"
                            >
                              {busyAction === `complete:${r.reservation_id}` ? "Completing..." : "Complete"}
                            </button>
                            <button
                              onClick={() => handleCancel(r.reservation_id)}
                              disabled={busyAction !== null}
                              className="border border-red-400 text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-50"
                            >
                              {busyAction === `cancel:${r.reservation_id}` ? "Cancelling..." : "Cancel"}
                            </button>
                          </>
                        )}
                        {["PENDING", "CONFIRMED"].includes(r.reservation_status) &&
                          r.reservation_end !== null &&
                          Date.parse(r.reservation_end) < Date.now() && (
                            <button
                              onClick={() => handleExpire(r.reservation_id)}
                              disabled={busyAction !== null}
                              className="border border-amber-400 px-3 py-1 text-xs font-bold text-amber-800 hover:bg-amber-50 rounded-lg disabled:opacity-50"
                            >
                              {busyAction === `expire:${r.reservation_id}` ? "Expiring..." : "Expire"}
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

      {/* Create Reservation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-800">
              Create Reservation
            </h2>

            <div>
              <label className={lbl}>Patient *</label>
              <select
                required
                className={field}
                value={form.patient_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, patient_id: e.target.value }))
                }
              >
                <option value="">Select Patient</option>
                {patients.map((p) => (
                  <option key={p.patient_id} value={p.patient_id}>
                    {p.first_name} {p.last_name} ({p.patient_number})
                  </option>
                ))}
              </select>
            </div>

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
                <option value="">Select Available Bed</option>
                {availableBeds.map((b) => (
                  <option key={b.bed_id} value={b.bed_id}>
                    {b.bed_number} — {b.bed_type}
                    {b.ward_name ? ` (${b.ward_name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={lbl}>Reservation Start *</label>
              <input
                type="datetime-local"
                required
                className={field}
                value={form.reservation_start}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reservation_start: e.target.value }))
                }
              />
            </div>

            <div>
              <label className={lbl}>Reservation End (optional)</label>
              <input
                type="datetime-local"
                className={field}
                value={form.reservation_end}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reservation_end: e.target.value }))
                }
              />
            </div>

            <div>
              <label className={lbl}>Reason (optional)</label>
              <textarea
                rows={2}
                className={field}
                value={form.reason}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reason: e.target.value }))
                }
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving..." : "Create"}
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
