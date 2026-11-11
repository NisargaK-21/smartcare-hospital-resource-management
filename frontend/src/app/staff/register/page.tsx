"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import { createStaff } from "@/lib/api/staff";
import { fetchRoles } from "@/lib/api/roles";
import { fetchDepartments } from "@/lib/api/departments";
import type { Role } from "@/types/role";
import type { Department } from "@/types/department";
import { EMPLOYMENT_STATUSES } from "@/lib/utils/constants";

const field = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "text-sm font-medium text-gray-700 mb-1 block";

export default function RegisterStaffPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [form, setForm] = useState({
    employee_number: "", first_name: "", last_name: "", role_id: "",
    department_id: "", designation: "", phone: "", email: "", hire_date: "", employment_status: "ACTIVE",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoles().then(setRoles).catch(() => {});
    fetchDepartments().then(setDepts).catch(() => {});
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await createStaff({ ...form, role_id: Number(form.role_id), department_id: Number(form.department_id) });
      router.push("/staff");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register staff");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Register Staff" subtitle="Add a new staff member" action={
        <button onClick={() => router.back()} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">← Back</button>
      } />
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl mx-auto space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={lbl}>Employee Number *</label><input required className={field} value={form.employee_number} onChange={e => set("employee_number", e.target.value)} /></div>
          <div><label className={lbl}>Phone *</label><input required className={field} value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
          <div><label className={lbl}>First Name *</label><input required className={field} value={form.first_name} onChange={e => set("first_name", e.target.value)} /></div>
          <div><label className={lbl}>Last Name *</label><input required className={field} value={form.last_name} onChange={e => set("last_name", e.target.value)} /></div>
          <div>
            <label className={lbl}>Role *</label>
            <select required className={field} value={form.role_id} onChange={e => set("role_id", e.target.value)}>
              <option value="">Select Role</option>
              {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Department *</label>
            <select required className={field} value={form.department_id} onChange={e => set("department_id", e.target.value)}>
              <option value="">Select Department</option>
              {depts.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Designation</label><input className={field} value={form.designation} onChange={e => set("designation", e.target.value)} /></div>
          <div><label className={lbl}>Email</label><input type="email" className={field} value={form.email} onChange={e => set("email", e.target.value)} /></div>
          <div><label className={lbl}>Hire Date *</label><input required type="date" max={new Date().toISOString().split("T")[0]} className={field} value={form.hire_date} onChange={e => set("hire_date", e.target.value)} /></div>
          <div>
            <label className={lbl}>Employment Status</label>
            <select className={field} value={form.employment_status} onChange={e => set("employment_status", e.target.value)}>
              {EMPLOYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Registering..." : "Register Staff"}</button>
          <button type="button" onClick={() => router.back()} className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
        </div>
      </form>
    </div>
  );
}

