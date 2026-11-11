"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import { fetchWards, createWard, updateWard, deactivateWard } from "@/lib/api/wards";
import { fetchDepartments } from "@/lib/api/departments";
import type { Ward } from "@/types/ward";
import type { Department } from "@/types/department";
import { WARD_TYPES } from "@/lib/utils/constants";

const field = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "text-sm font-medium text-gray-700 mb-1 block";

export default function WardsPage() {
  const router = useRouter();
  const [wards, setWards] = useState<Ward[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Ward | null>(null);
  const [form, setForm] = useState({ ward_name: "", ward_code: "", ward_type: "GENERAL", capacity: "", department_id: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [w, d] = await Promise.all([fetchWards().catch(() => []), fetchDepartments().catch(() => [])]);
    setWards(w); setDepts(d); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const openAdd = () => { setEditTarget(null); setForm({ ward_name: "", ward_code: "", ward_type: "GENERAL", capacity: "", department_id: String(depts[0]?.department_id ?? "") }); setModalOpen(true); };
  const openEdit = (w: Ward) => { setEditTarget(w); setForm({ ward_name: w.ward_name, ward_code: w.ward_code, ward_type: w.ward_type, capacity: String(w.capacity), department_id: String(w.department_id) }); setModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, ward_type: form.ward_type as Ward["ward_type"], capacity: Number(form.capacity), department_id: Number(form.department_id) };
      if (editTarget) { await updateWard(editTarget.ward_id, payload); showToast("Ward updated"); }
      else { await createWard(payload); showToast("Ward created"); }
      setModalOpen(false); load();
    } catch (err) { alert(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id: number) => {
    if (!window.confirm("Deactivate this ward?")) return;
    await deactivateWard(id).catch(() => {}); load();
  };

  const filtered = wards.filter(w => {
    if (typeFilter !== "ALL" && w.ward_type !== typeFilter) return false;
    if (deptFilter !== "ALL" && w.department_name !== deptFilter) return false;
    return true;
  });

  const uniqueDepts = [...new Set(wards.map(w => w.department_name).filter(Boolean))];

  return (
    <div className="space-y-5">
      <PageHeader title="Wards" subtitle={`${filtered.length} wards`} action={
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Ward</button>
      } />
      <div className="flex gap-3 flex-wrap">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="ALL">All Types</option>
          {WARD_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="ALL">All Departments</option>
          {uniqueDepts.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Ward Name</th>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Department</th>
                <th className="text-left px-4 py-3">Capacity</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">No wards found</td></tr>
                : filtered.map(w => (
                  <tr key={w.ward_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{w.ward_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{w.ward_code}</td>
                    <td className="px-4 py-3"><Badge label={w.ward_type} color={w.ward_type === "ICU" ? "red" : "blue"} /></td>
                    <td className="px-4 py-3 text-gray-600">{w.department_name}</td>
                    <td className="px-4 py-3">{w.capacity}</td>
                    <td className="px-4 py-3"><Badge label={w.is_active ? "Active" : "Inactive"} color={w.is_active ? "green" : "red"} /></td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => router.push(`/wards/${w.ward_id}`)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium">View</button>
                      <button onClick={() => openEdit(w)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium">Edit</button>
                      {w.is_active && <button onClick={() => handleDeactivate(w.ward_id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium">Deactivate</button>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">{editTarget ? "Edit Ward" : "Add Ward"}</h2>
            <div><label className={lbl}>Ward Name *</label><input required className={field} value={form.ward_name} onChange={e => setForm(f => ({ ...f, ward_name: e.target.value }))} /></div>
            <div><label className={lbl}>Ward Code *</label><input required className={field} value={form.ward_code} onChange={e => setForm(f => ({ ...f, ward_code: e.target.value }))} /></div>
            <div>
              <label className={lbl}>Ward Type *</label>
              <select required className={field} value={form.ward_type} onChange={e => setForm(f => ({ ...f, ward_type: e.target.value }))}>
                {WARD_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Capacity *</label><input required type="number" min="1" className={field} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} /></div>
            <div>
              <label className={lbl}>Department *</label>
              <select required className={field} value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                <option value="">Select Department</option>
                {depts.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
              <button type="button" onClick={() => setModalOpen(false)} className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}
      {toast && <div className="fixed bottom-5 right-5 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}
    </div>
  );
}

