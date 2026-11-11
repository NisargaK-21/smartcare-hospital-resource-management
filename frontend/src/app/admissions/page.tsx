"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import ActionError from "@/components/shared/ActionError";
import { fetchAdmissions, createAdmission, allocateBed, cancelAdmission } from "@/lib/api/admissions";
import { fetchPatients } from "@/lib/api/patients";
import { fetchStaff } from "@/lib/api/staff";
import type { Admission, AdmissionStatus, RequiredBedType, AdmissionType } from "@/types/admission";
import type { Patient } from "@/types/patient";
import type { Staff } from "@/types/staff";
import { formatDate } from "@/lib/utils/formatDate";

const field = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "text-sm font-medium text-gray-700 mb-1 block";

const statusColor: Record<AdmissionStatus, "amber" | "green" | "gray" | "blue"> = {
  PENDING: "amber",
  ACTIVE: "green",
  CANCELLED: "gray",
  DISCHARGED: "blue",
};

const statusChipClass: Record<AdmissionStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900 border-amber-300",
  ACTIVE: "bg-emerald-100 text-emerald-900 border-emerald-300",
  CANCELLED: "bg-slate-100 text-slate-800 border-slate-300",
  DISCHARGED: "bg-blue-100 text-blue-900 border-blue-300",
};

const STATUSES: AdmissionStatus[] = ["PENDING", "ACTIVE", "CANCELLED", "DISCHARGED"];
const BED_TYPES: RequiredBedType[] = ["GENERAL", "ICU", "EMERGENCY", "PRIVATE"];
const ADMISSION_TYPES: AdmissionType[] = ["PLANNED", "EMERGENCY", "TRANSFER"];

interface FormState {
  patient_id: string;
  admission_type: AdmissionType;
  required_bed_type: RequiredBedType;
  reason: string;
  admitted_by: string;
}

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [bedTypeFilter, setBedTypeFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    patient_id: "",
    admission_type: "PLANNED",
    required_bed_type: "GENERAL",
    reason: "",
    admitted_by: "",
  });
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [a, p, s] = await Promise.all([
        fetchAdmissions(),
        fetchPatients(),
        fetchStaff(),
      ]);
      setAdmissions(a);
      setPatients(p);
      setStaff(s);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load admissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const filtered = admissions.filter((a) => {
    if (statusFilter !== "ALL" && a.admission_status !== statusFilter) return false;
    if (bedTypeFilter !== "ALL" && a.required_bed_type !== bedTypeFilter) return false;
    if (typeFilter !== "ALL" && a.admission_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.patient_name.toLowerCase().includes(q) && !a.medical_record_number.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = { PENDING: 0, ACTIVE: 0, CANCELLED: 0, DISCHARGED: 0 };
  filtered.forEach((a) => {
    if (a.admission_status in counts) counts[a.admission_status as AdmissionStatus]++;
  });

  const openCreate = () => {
    setActionError("");
    setForm({ patient_id: "", admission_type: "PLANNED", required_bed_type: "GENERAL", reason: "", admitted_by: "" });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient_id) return;
    setSaving(true);
    setActionError("");
    try {
      await createAdmission({
        patient_id: Number(form.patient_id),
        required_bed_type: form.required_bed_type,
        admission_type: form.admission_type,
        reason: form.reason || undefined,
        admitted_by: form.admitted_by ? Number(form.admitted_by) : undefined,
      });
      showToast("Admission created successfully");
      setModalOpen(false);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error creating admission");
    } finally {
      setSaving(false);
    }
  };

  const handleAllocateBed = async (id: number) => {
    setBusyAction(`allocate:${id}`);
    setActionError("");
    try {
      await allocateBed(id);
      showToast("Bed allocated successfully");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error allocating bed");
    } finally {
      setBusyAction(null);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm("Cancel this admission?")) return;
    setBusyAction(`cancel:${id}`);
    setActionError("");
    try {
      await cancelAdmission(id);
      showToast("Admission cancelled");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error cancelling admission");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admissions"
        subtitle={`${filtered.length} admission${filtered.length !== 1 ? "s" : ""}`}
        action={
          <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Create Admission
          </button>
        }
      />
      <ActionError message={actionError} />

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        {STATUSES.map((s) => (
          <span key={s} className={`px-3 py-1 rounded-full text-xs font-bold border ${statusChipClass[s]}`}>
            {s}: {counts[s]}
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="text"
          placeholder="Search patient or MRN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select
          value={bedTypeFilter}
          onChange={(e) => setBedTypeFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Bed Types</option>
          {BED_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Types</option>
          {ADMISSION_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Loading admissions...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 font-medium">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3">Patient</th>
                <th className="text-left px-4 py-3">MRN</th>
                <th className="text-left px-4 py-3">Admission Type</th>
                <th className="text-left px-4 py-3">Required Bed</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Bed Assigned</th>
                <th className="text-left px-4 py-3">Admission Date</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500 font-medium">No admissions found.</td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.admission_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{a.patient_name}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 text-xs">{a.medical_record_number}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700 text-xs">{a.admission_type}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700 text-xs">{a.required_bed_type}</td>
                    <td className="px-4 py-3">
                      <Badge color={statusColor[a.admission_status]}>{a.admission_status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {a.bed_number ? `${a.bed_number}${a.bed_type ? ` (${a.bed_type})` : ""}` : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(a.admission_date)}</td>
                    <td className="px-4 py-3 flex gap-2">
                      {a.admission_status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleAllocateBed(a.admission_id)}
                            disabled={busyAction !== null}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                          >
                            {busyAction === `allocate:${a.admission_id}` ? "Allocating..." : "Allocate Bed"}
                          </button>
                          <button
                            onClick={() => handleCancel(a.admission_id)}
                            disabled={busyAction !== null}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                          >
                            {busyAction === `cancel:${a.admission_id}` ? "Cancelling..." : "Cancel"}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Admission Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Create Admission</h2>
            <div>
              <label className={lbl}>Patient *</label>
              <select
                required
                className={field}
                value={form.patient_id}
                onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
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
              <label className={lbl}>Admission Type *</label>
              <select
                required
                className={field}
                value={form.admission_type}
                onChange={(e) => setForm((f) => ({ ...f, admission_type: e.target.value as AdmissionType }))}
              >
                {ADMISSION_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Required Bed Type *</label>
              <select
                required
                className={field}
                value={form.required_bed_type}
                onChange={(e) => setForm((f) => ({ ...f, required_bed_type: e.target.value as RequiredBedType }))}
              >
                {BED_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Admitted By</label>
              <select
                className={field}
                value={form.admitted_by}
                onChange={(e) => setForm((f) => ({ ...f, admitted_by: e.target.value }))}
              >
                <option value="">Select Staff (optional)</option>
                {staff.map((s) => (
                  <option key={s.staff_id} value={s.staff_id}>
                    {s.first_name} {s.last_name}{s.designation ? ` — ${s.designation}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Reason</label>
              <textarea
                rows={3}
                className={field}
                value={form.reason}
                placeholder="Optional reason for admission..."
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Admission"}
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
