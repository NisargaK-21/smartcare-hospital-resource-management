"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import { fetchDepartmentById } from "@/lib/api/departments";
import { fetchWards, createWard } from "@/lib/api/wards";
import type { Department } from "@/types/department";
import type { Ward } from "@/types/ward";
import { WARD_TYPES } from "@/lib/utils/constants";

const field = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "text-sm font-medium text-gray-700 mb-1 block";

export default function DepartmentDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [dept, setDept] = useState<Department | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ward_name: "", ward_code: "", ward_type: "GENERAL", capacity: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [d, w] = await Promise.all([
      fetchDepartmentById(Number(id)).catch(() => null),
      fetchWards({ department_id: Number(id) }).catch(() => []),
    ]);
    setDept(d);
    setWards(w);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleAddWard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createWard({ ...form, ward_type: form.ward_type as Ward["ward_type"], department_id: Number(id), capacity: Number(form.capacity) });
      showToast("Ward added");
      setModalOpen(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (!dept) return <div className="p-8 text-center text-red-400">Department not found</div>;

  return (
    <div className="space-y-5">
      <PageHeader title={dept.department_name} subtitle={dept.department_code} action={
        <button onClick={() => router.back()} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">← Back</button>
      } />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div><p className="text-xs text-gray-500">Code</p><p className="font-mono font-semibold">{dept.department_code}</p></div>
        <div><p className="text-xs text-gray-500">Description</p><p className="text-sm">{dept.description ?? "—"}</p></div>
        <div><p className="text-xs text-gray-500">Status</p><Badge label={dept.is_active ? "Active" : "Inactive"} color={dept.is_active ? "green" : "red"} /></div>
        <div><p className="text-xs text-gray-500">Wards</p><p className="text-2xl font-bold text-blue-600">{wards.length}</p></div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-700">Wards</span>
          <button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium">+ Add Ward</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Ward Name</th>
              <th className="text-left px-4 py-3">Code</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Capacity</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {wards.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No wards yet</td></tr>
            ) : wards.map(w => (
              <tr key={w.ward_id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{w.ward_name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{w.ward_code}</td>
                <td className="px-4 py-3"><Badge label={w.ward_type} color={w.ward_type === "ICU" ? "red" : "blue"} /></td>
                <td className="px-4 py-3">{w.capacity}</td>
                <td className="px-4 py-3"><Badge label={w.is_active ? "Active" : "Inactive"} color={w.is_active ? "green" : "red"} /></td>
                <td className="px-4 py-3">
                  <button onClick={() => router.push(`/wards/${w.ward_id}`)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={handleAddWard} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Add Ward</h2>
            <div><label className={lbl}>Ward Name *</label><input required className={field} value={form.ward_name} onChange={e => setForm(f => ({ ...f, ward_name: e.target.value }))} /></div>
            <div><label className={lbl}>Ward Code *</label><input required className={field} value={form.ward_code} onChange={e => setForm(f => ({ ...f, ward_code: e.target.value }))} /></div>
            <div>
              <label className={lbl}>Ward Type *</label>
              <select required className={field} value={form.ward_type} onChange={e => setForm(f => ({ ...f, ward_type: e.target.value }))}>
                {WARD_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Capacity *</label><input required type="number" min="1" className={field} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} /></div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : "Add Ward"}</button>
              <button type="button" onClick={() => setModalOpen(false)} className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}
      {toast && <div className="fixed bottom-5 right-5 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}
    </div>
  );
}

