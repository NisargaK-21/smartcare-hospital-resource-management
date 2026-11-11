"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import { fetchDepartments, createDepartment, updateDepartment, deactivateDepartment } from "@/lib/api/departments";
import type { Department } from "@/types/department";

const field = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "text-sm font-medium text-gray-700 mb-1 block";

export default function DepartmentsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [form, setForm] = useState({ department_name: "", department_code: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchDepartments().catch(() => []);
    setDepartments(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const openAdd = () => { setEditTarget(null); setForm({ department_name: "", department_code: "", description: "" }); setModalOpen(true); };
  const openEdit = (d: Department) => { setEditTarget(d); setForm({ department_name: d.department_name, department_code: d.department_code, description: d.description ?? "" }); setModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editTarget) {
        await updateDepartment(editTarget.department_id, form);
        showToast("Department updated");
      } else {
        await createDepartment(form);
        showToast("Department created");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (id: number) => {
    if (!window.confirm("Deactivate this department?")) return;
    await deactivateDepartment(id).catch(() => {});
    load();
  };

  const filtered = departments.filter(d =>
    d.department_name.toLowerCase().includes(search.toLowerCase()) ||
    d.department_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Departments" subtitle={`${filtered.length} departments`} action={
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Department</button>
      } />
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search departments..." className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">No departments found</td></tr>
              ) : filtered.map(d => (
                <tr key={d.department_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{d.department_code}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{d.department_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{d.description ?? "—"}</td>
                  <td className="px-4 py-3"><Badge label={d.is_active ? "Active" : "Inactive"} color={d.is_active ? "green" : "red"} /></td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => router.push(`/departments/${d.department_id}`)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium">View</button>
                    <button onClick={() => openEdit(d)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium">Edit</button>
                    {d.is_active && <button onClick={() => handleDeactivate(d.department_id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium">Deactivate</button>}
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
            <h2 className="text-lg font-semibold text-gray-800">{editTarget ? "Edit Department" : "Add Department"}</h2>
            <div>
              <label className={lbl}>Department Name *</label>
              <input required className={field} value={form.department_name} onChange={e => setForm(f => ({ ...f, department_name: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>Department Code *</label>
              <input required className={field} value={form.department_code} onChange={e => setForm(f => ({ ...f, department_code: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>Description</label>
              <textarea rows={2} className={field} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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

