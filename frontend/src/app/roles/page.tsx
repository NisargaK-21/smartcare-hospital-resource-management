"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import { fetchRoles, createRole, updateRole, deactivateRole } from "@/lib/api/roles";
import type { Role } from "@/types/role";

const field = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "text-sm font-medium text-gray-700 mb-1 block";

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Role | null>(null);
  const [form, setForm] = useState({ role_name: "", description: "", is_active: true });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchRoles().catch(() => []);
    setRoles(data); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };
  const openAdd = () => { setEditTarget(null); setForm({ role_name: "", description: "", is_active: true }); setModalOpen(true); };
  const openEdit = (r: Role) => { setEditTarget(r); setForm({ role_name: r.role_name, description: r.description ?? "", is_active: r.is_active }); setModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editTarget) { await updateRole(editTarget.role_id, form); showToast("Role updated"); }
      else { await createRole(form); showToast("Role created"); }
      setModalOpen(false); load();
    } catch (err) { alert(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id: number) => {
    if (!window.confirm("Deactivate this role?")) return;
    await deactivateRole(id).catch(() => {}); load();
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Roles" subtitle={`${roles.length} roles`} action={
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Role</button>
      } />
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Role Name</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 ? <tr><td colSpan={4} className="text-center py-10 text-gray-400">No roles found</td></tr>
                : roles.map(r => (
                  <tr key={r.role_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.role_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.description ?? "—"}</td>
                    <td className="px-4 py-3"><Badge label={r.is_active ? "Active" : "Inactive"} color={r.is_active ? "green" : "red"} /></td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => openEdit(r)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium">Edit</button>
                      {r.is_active && <button onClick={() => handleDeactivate(r.role_id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium">Deactivate</button>}
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
            <h2 className="text-lg font-semibold text-gray-800">{editTarget ? "Edit Role" : "Add Role"}</h2>
            <div><label className={lbl}>Role Name *</label><input required className={field} value={form.role_name} onChange={e => setForm(f => ({ ...f, role_name: e.target.value }))} /></div>
            <div><label className={lbl}>Description</label><textarea rows={2} className={field} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            {editTarget && (
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                Active
              </label>
            )}
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

