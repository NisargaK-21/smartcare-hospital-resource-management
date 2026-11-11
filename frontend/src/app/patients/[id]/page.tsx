"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import { fetchPatientById, updatePatient, deactivatePatient } from "@/lib/api/patients";
import type { Patient } from "@/types/patient";
import { GENDER_OPTIONS, BLOOD_GROUPS } from "@/lib/utils/constants";
import { formatDate } from "@/lib/utils/formatDate";

const field = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "text-sm font-medium text-gray-500";
const val = "text-sm text-gray-800 font-medium";

export default function PatientProfilePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Patient>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await fetchPatientById(Number(id));
      setPatient(p);
      setForm(p);
    } catch { setError("Patient not found"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePatient(Number(id), form);
      showToast("Patient updated successfully");
      setEditing(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally { setSaving(false); }
  };

  const handleDeactivate = async () => {
    if (!window.confirm("Deactivate this patient?")) return;
    await deactivatePatient(Number(id)).catch(() => {});
    router.push("/patients");
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (!patient) return <div className="p-8 text-center text-red-400">{error || "Not found"}</div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title={`${patient.first_name} ${patient.last_name}`}
        subtitle={patient.patient_number}
        action={
          <div className="flex gap-2">
            <button onClick={() => router.push(`/patients/${id}/history`)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">View History</button>
            <button onClick={() => router.back()} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">← Back</button>
          </div>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <Badge label={patient.is_active ? "Active" : "Inactive"} color={patient.is_active ? "green" : "red"} />
          <div className="flex gap-2">
            {!editing ? (
              <button onClick={() => setEditing(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Edit</button>
            ) : (
              <>
                <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
                <button onClick={() => { setEditing(false); setForm(patient); }} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">Cancel</button>
              </>
            )}
            {patient.is_active && <button onClick={handleDeactivate} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium">Deactivate</button>}
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {editing ? (
            <>
              {[["First Name","first_name"],["Last Name","last_name"],["Phone","phone"],["Email","email"],["Emergency Contact Name","emergency_contact_name"],["Emergency Contact Phone","emergency_contact_phone"]].map(([label, key]) => (
                <div key={key}>
                  <p className={lbl}>{label}</p>
                  <input className={field} value={(form[key as keyof Patient] as string) ?? ""} onChange={e => set(key, e.target.value)} />
                </div>
              ))}
              <div>
                <p className={lbl}>Date of Birth</p>
                <input type="date" className={field} value={(form.date_of_birth ?? "").substring(0,10)} onChange={e => set("date_of_birth", e.target.value)} />
              </div>
              <div>
                <p className={lbl}>Gender</p>
                <select className={field} value={form.gender ?? ""} onChange={e => set("gender", e.target.value)}>
                  {GENDER_OPTIONS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <p className={lbl}>Blood Group</p>
                <select className={field} value={form.blood_group ?? ""} onChange={e => set("blood_group", e.target.value)}>
                  <option value="">None</option>
                  {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              {[
                ["Patient #", patient.patient_number],
                ["First Name", patient.first_name],
                ["Last Name", patient.last_name],
                ["Date of Birth", formatDate(patient.date_of_birth)],
                ["Gender", patient.gender],
                ["Blood Group", patient.blood_group ?? "—"],
                ["Phone", patient.phone],
                ["Email", patient.email ?? "—"],
                ["Emergency Contact", patient.emergency_contact_name ?? "—"],
                ["Emergency Phone", patient.emergency_contact_phone ?? "—"],
                ["Registered", formatDate(patient.created_at)],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className={lbl}>{l}</p>
                  <p className={val}>{v}</p>
                </div>
              ))}
              {patient.address && (
                <div className="col-span-2">
                  <p className={lbl}>Address</p>
                  <p className={val}>{patient.address}</p>
                </div>
              )}
            </>
          )}
          {editing && (
            <div className="col-span-2">
              <p className={lbl}>Address</p>
              <textarea rows={2} className={field} value={(form.address as string) ?? ""} onChange={e => set("address", e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>
      )}
    </div>
  );
}

