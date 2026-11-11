"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import { fetchStaffById, updateStaff, deactivateStaff } from "@/lib/api/staff";
import { fetchRoles } from "@/lib/api/roles";
import { fetchDepartments } from "@/lib/api/departments";
import type { Staff } from "@/types/staff";
import type { Role } from "@/types/role";
import type { Department } from "@/types/department";
import { EMPLOYMENT_STATUSES } from "@/lib/utils/constants";
import { formatDate } from "@/lib/utils/formatDate";

const field = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "text-xs text-gray-500";
const val = "text-sm font-medium text-gray-800";

const statusColor: Record<string, "green" | "amber" | "gray" | "red"> = {
  ACTIVE: "green", ON_LEAVE: "amber", INACTIVE: "gray", TERMINATED: "red",
};

export default function StaffProfilePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Staff>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [s, r, d] = await Promise.all([fetchStaffById(Number(id)).catch(() => null), fetchRoles().catch(() => []), fetchDepartments().catch(() => [])]);
    setStaff(s); setRoles(r); setDepts(d);
    if (s) setForm(s);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await updateStaff(Number(id), { ...form, role_id: Number(form.role_id), department_id: Number(form.department_id) });
      showToast("Staff updated"); setEditing(false); load();
    } catch (err) { setError(err instanceof Error ? err.message : "Update failed"); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async () => {
    if (!window.confirm("Deactivate this staff member?")) return;
    await deactivateStaff(Number(id)).catch(() => {});
    router.push("/staff");
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (!staff) return <div className="p-8 text-center text-red-400">Staff not found</div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader title={`${staff.first_name} ${staff.last_name}`} subtitle={staff.employee_number} action={
        <div className="flex gap-2">
          {staff.is_active && <button onClick={handleDeactivate} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium">Deactivate</button>}
          <button onClick={() => router.back()} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">← Back</button>
        </div>
      } />
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <Badge label={staff.employment_status} color={statusColor[staff.employment_status] ?? "gray"} />
          <div className="flex gap-2">
            {!editing ? (
              <button onClick={() => setEditing(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Edit</button>
            ) : (
              <>
                <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
                <button onClick={() => { setEditing(false); setForm(staff); }} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">Cancel</button>
              </>
            )}
          </div>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {editing ? (
            <>
              {[["First Name","first_name"],["Last Name","last_name"],["Phone","phone"],["Email","email"],["Designation","designation"]].map(([label, key]) => (
                <div key={key}><p className={lbl}>{label}</p><input className={field} value={(form[key as keyof Staff] as string) ?? ""} onChange={e => set(key, e.target.value)} /></div>
              ))}
              <div>
                <p className={lbl}>Hire Date</p>
                <input type="date" className={field} value={(form.hire_date ?? "").substring(0,10)} onChange={e => set("hire_date", e.target.value)} />
              </div>
              <div>
                <p className={lbl}>Role</p>
                <select className={field} value={String(form.role_id ?? "")} onChange={e => set("role_id", e.target.value)}>
                  {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
                </select>
              </div>
              <div>
                <p className={lbl}>Department</p>
                <select className={field} value={String(form.department_id ?? "")} onChange={e => set("department_id", e.target.value)}>
                  {depts.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                </select>
              </div>
              <div>
                <p className={lbl}>Employment Status</p>
                <select className={field} value={form.employment_status ?? ""} onChange={e => set("employment_status", e.target.value)}>
                  {EMPLOYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              {[
                ["Employee #", staff.employee_number],
                ["First Name", staff.first_name],
                ["Last Name", staff.last_name],
                ["Role", staff.role_name ?? "—"],
                ["Department", staff.department_name ?? "—"],
                ["Designation", staff.designation ?? "—"],
                ["Phone", staff.phone],
                ["Email", staff.email ?? "—"],
                ["Hire Date", formatDate(staff.hire_date)],
                ["Employment Status", staff.employment_status],
              ].map(([l, v]) => (
                <div key={l}><p className={lbl}>{l}</p><p className={val}>{v}</p></div>
              ))}
            </>
          )}
        </div>
      </div>
      {toast && <div className="fixed bottom-5 right-5 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}
    </div>
  );
}

