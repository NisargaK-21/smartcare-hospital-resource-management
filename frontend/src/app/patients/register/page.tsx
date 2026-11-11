"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import { createPatient } from "@/lib/api/patients";
import { GENDER_OPTIONS, BLOOD_GROUPS } from "@/lib/utils/constants";

const field = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const label = "text-sm font-medium text-gray-700 mb-1 block";

export default function RegisterPatientPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    patient_number: "", first_name: "", last_name: "", date_of_birth: "",
    gender: "MALE", blood_group: "", phone: "", email: "", address: "",
    emergency_contact_name: "", emergency_contact_phone: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createPatient({ ...form, blood_group: form.blood_group || undefined });
      router.push("/patients");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register patient");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Register Patient" subtitle="Add a new patient record" action={
        <button onClick={() => router.back()} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">← Back</button>
      } />
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl mx-auto space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Patient Number *</label>
            <input required className={field} value={form.patient_number} onChange={e => set("patient_number", e.target.value)} />
          </div>
          <div>
            <label className={label}>Phone *</label>
            <input required className={field} value={form.phone} onChange={e => set("phone", e.target.value)} />
          </div>
          <div>
            <label className={label}>First Name *</label>
            <input required className={field} value={form.first_name} onChange={e => set("first_name", e.target.value)} />
          </div>
          <div>
            <label className={label}>Last Name *</label>
            <input required className={field} value={form.last_name} onChange={e => set("last_name", e.target.value)} />
          </div>
          <div>
            <label className={label}>Date of Birth *</label>
            <input required type="date" className={field} value={form.date_of_birth} onChange={e => set("date_of_birth", e.target.value)} />
          </div>
          <div>
            <label className={label}>Gender *</label>
            <select required className={field} value={form.gender} onChange={e => set("gender", e.target.value)}>
              {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Blood Group</label>
            <select className={field} value={form.blood_group} onChange={e => set("blood_group", e.target.value)}>
              <option value="">Select</option>
              {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Email</label>
            <input type="email" className={field} value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div>
            <label className={label}>Emergency Contact Name</label>
            <input className={field} value={form.emergency_contact_name} onChange={e => set("emergency_contact_name", e.target.value)} />
          </div>
          <div>
            <label className={label}>Emergency Contact Phone</label>
            <input className={field} value={form.emergency_contact_phone} onChange={e => set("emergency_contact_phone", e.target.value)} />
          </div>
        </div>
        <div>
          <label className={label}>Address</label>
          <textarea rows={3} className={field} value={form.address} onChange={e => set("address", e.target.value)} />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? "Registering..." : "Register Patient"}
          </button>
          <button type="button" onClick={() => router.back()} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
        </div>
      </form>
    </div>
  );
}

