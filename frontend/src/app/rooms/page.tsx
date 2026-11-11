"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import { fetchRooms, createRoom, updateRoom, deactivateRoom } from "@/lib/api/rooms";
import { fetchWards } from "@/lib/api/wards";
import type { Room } from "@/types/room";
import type { Ward } from "@/types/ward";

const field = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "text-sm font-medium text-gray-700 mb-1 block";

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [wardFilter, setWardFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Room | null>(null);
  const [form, setForm] = useState({ room_number: "", room_type: "", capacity: "", description: "", ward_id: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [r, w] = await Promise.all([fetchRooms().catch(() => []), fetchWards().catch(() => [])]);
    setRooms(r); setWards(w); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };
  const openAdd = () => { setEditTarget(null); setForm({ room_number: "", room_type: "", capacity: "", description: "", ward_id: String(wards[0]?.ward_id ?? "") }); setModalOpen(true); };
  const openEdit = (r: Room) => { setEditTarget(r); setForm({ room_number: r.room_number, room_type: r.room_type, capacity: String(r.capacity), description: r.description ?? "", ward_id: String(r.ward_id) }); setModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, capacity: Number(form.capacity), ward_id: Number(form.ward_id) };
      if (editTarget) { await updateRoom(editTarget.room_id, payload); showToast("Room updated"); }
      else { await createRoom(payload); showToast("Room created"); }
      setModalOpen(false); load();
    } catch (err) { alert(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id: number) => {
    if (!window.confirm("Deactivate this room?")) return;
    await deactivateRoom(id).catch(() => {}); load();
  };

  const filtered = wardFilter === "ALL" ? rooms : rooms.filter(r => r.ward_name === wardFilter);
  const uniqueWards = [...new Set(rooms.map(r => r.ward_name).filter(Boolean))];

  return (
    <div className="space-y-5">
      <PageHeader title="Rooms" subtitle={`${filtered.length} rooms`} action={
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Room</button>
      } />
      <select value={wardFilter} onChange={e => setWardFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
        <option value="ALL">All Wards</option>
        {uniqueWards.map(w => <option key={w}>{w}</option>)}
      </select>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Room #</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Ward</th>
                <th className="text-left px-4 py-3">Department</th>
                <th className="text-left px-4 py-3">Capacity</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">No rooms found</td></tr>
                : filtered.map(r => (
                  <tr key={r.room_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.room_number}</td>
                    <td className="px-4 py-3 text-gray-500">{r.room_type}</td>
                    <td className="px-4 py-3 text-gray-600">{r.ward_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.department_name}</td>
                    <td className="px-4 py-3">{r.capacity}</td>
                    <td className="px-4 py-3"><Badge label={r.is_active ? "Active" : "Inactive"} color={r.is_active ? "green" : "red"} /></td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => router.push(`/rooms/${r.room_id}`)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium">View</button>
                      <button onClick={() => openEdit(r)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium">Edit</button>
                      {r.is_active && <button onClick={() => handleDeactivate(r.room_id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium">Deactivate</button>}
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
            <h2 className="text-lg font-semibold text-gray-800">{editTarget ? "Edit Room" : "Add Room"}</h2>
            <div><label className={lbl}>Room Number *</label><input required className={field} value={form.room_number} onChange={e => setForm(f => ({ ...f, room_number: e.target.value }))} /></div>
            <div><label className={lbl}>Room Type *</label><input required placeholder="e.g. GENERAL, PRIVATE" className={field} value={form.room_type} onChange={e => setForm(f => ({ ...f, room_type: e.target.value }))} /></div>
            <div><label className={lbl}>Capacity *</label><input required type="number" min="1" className={field} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} /></div>
            <div>
              <label className={lbl}>Ward *</label>
              <select required className={field} value={form.ward_id} onChange={e => setForm(f => ({ ...f, ward_id: e.target.value }))}>
                <option value="">Select Ward</option>
                {wards.map(w => <option key={w.ward_id} value={w.ward_id}>{w.ward_name} ({w.department_name})</option>)}
              </select>
            </div>
            <div><label className={lbl}>Description</label><textarea rows={2} className={field} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
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

