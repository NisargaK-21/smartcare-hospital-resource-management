"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import { fetchWardById } from "@/lib/api/wards";
import { fetchRooms, createRoom } from "@/lib/api/rooms";
import type { Ward } from "@/types/ward";
import type { Room } from "@/types/room";

const field = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "text-sm font-medium text-gray-700 mb-1 block";

export default function WardDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [ward, setWard] = useState<Ward | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ room_number: "", room_type: "", capacity: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [w, r] = await Promise.all([fetchWardById(Number(id)).catch(() => null), fetchRooms({ ward_id: Number(id) }).catch(() => [])]);
    setWard(w); setRooms(r); setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await createRoom({ ...form, ward_id: Number(id), capacity: Number(form.capacity) });
      showToast("Room added"); setModalOpen(false); load();
    } catch (err) { alert(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (!ward) return <div className="p-8 text-center text-red-400">Ward not found</div>;

  return (
    <div className="space-y-5">
      <PageHeader title={ward.ward_name} subtitle={ward.ward_code} action={
        <button onClick={() => router.back()} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">← Back</button>
      } />
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div><p className="text-xs text-gray-500">Type</p><Badge label={ward.ward_type} color={ward.ward_type === "ICU" ? "red" : "blue"} /></div>
        <div><p className="text-xs text-gray-500">Department</p><p className="text-sm font-medium">{ward.department_name}</p></div>
        <div><p className="text-xs text-gray-500">Capacity</p><p className="text-2xl font-bold text-blue-600">{ward.capacity}</p></div>
        <div><p className="text-xs text-gray-500">Rooms</p><p className="text-2xl font-bold text-indigo-600">{rooms.length}</p></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-700">Rooms</span>
          <button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium">+ Add Room</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Room #</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Capacity</th>
              <th className="text-left px-4 py-3">Description</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">No rooms yet</td></tr>
              : rooms.map(r => (
                <tr key={r.room_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.room_number}</td>
                  <td className="px-4 py-3 text-gray-500">{r.room_type}</td>
                  <td className="px-4 py-3">{r.capacity}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.description ?? "—"}</td>
                  <td className="px-4 py-3"><Badge label={r.is_active ? "Active" : "Inactive"} color={r.is_active ? "green" : "red"} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => router.push(`/rooms/${r.room_id}`)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium">View</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={handleAddRoom} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Add Room</h2>
            <div><label className={lbl}>Room Number *</label><input required className={field} value={form.room_number} onChange={e => setForm(f => ({ ...f, room_number: e.target.value }))} /></div>
            <div><label className={lbl}>Room Type *</label><input required placeholder="e.g. GENERAL, PRIVATE" className={field} value={form.room_type} onChange={e => setForm(f => ({ ...f, room_type: e.target.value }))} /></div>
            <div><label className={lbl}>Capacity *</label><input required type="number" min="1" className={field} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} /></div>
            <div><label className={lbl}>Description</label><textarea rows={2} className={field} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : "Add Room"}</button>
              <button type="button" onClick={() => setModalOpen(false)} className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}
      {toast && <div className="fixed bottom-5 right-5 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}
    </div>
  );
}

