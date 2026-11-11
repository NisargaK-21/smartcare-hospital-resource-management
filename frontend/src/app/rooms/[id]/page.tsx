"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import { fetchRoomById } from "@/lib/api/rooms";
import { fetchBeds, createBed } from "@/lib/api/beds";
import type { Room } from "@/types/room";
import type { Bed } from "@/types/bed";
import { BED_TYPES, BED_STATUSES } from "@/lib/utils/constants";

const field = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "text-sm font-medium text-gray-700 mb-1 block";

const statusColor: Record<string, "green" | "red" | "amber" | "gray"> = {
  AVAILABLE: "green", OCCUPIED: "red", RESERVED: "amber", MAINTENANCE: "gray",
};

export default function RoomDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ bed_number: "", bed_type: "STANDARD", bed_status: "AVAILABLE", description: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [r, b] = await Promise.all([fetchRoomById(Number(id)).catch(() => null), fetchBeds({ room_id: Number(id) }).catch(() => [])]);
    setRoom(r); setBeds(b); setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleAddBed = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await createBed({ ...form, bed_type: form.bed_type as Bed["bed_type"], bed_status: form.bed_status as Bed["bed_status"], room_id: Number(id) });
      showToast("Bed added"); setModalOpen(false); load();
    } catch (err) { alert(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (!room) return <div className="p-8 text-center text-red-400">Room not found</div>;

  return (
    <div className="space-y-5">
      <PageHeader title={`Room ${room.room_number}`} subtitle={room.room_type} action={
        <button onClick={() => router.back()} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">← Back</button>
      } />
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div><p className="text-xs text-gray-500">Ward</p><p className="text-sm font-medium">{room.ward_name}</p></div>
        <div><p className="text-xs text-gray-500">Department</p><p className="text-sm">{room.department_name}</p></div>
        <div><p className="text-xs text-gray-500">Capacity</p><p className="text-2xl font-bold text-blue-600">{room.capacity}</p></div>
        <div><p className="text-xs text-gray-500">Beds</p><p className="text-2xl font-bold text-indigo-600">{beds.length}</p></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-700">Beds</span>
          <button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium">+ Add Bed</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Bed #</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Description</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {beds.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">No beds yet</td></tr>
              : beds.map(b => (
                <tr key={b.bed_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{b.bed_number}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{b.bed_type}</td>
                  <td className="px-4 py-3"><Badge label={b.bed_status} color={statusColor[b.bed_status] ?? "gray"} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{b.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => router.push(`/beds/${b.bed_id}`)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium">View</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={handleAddBed} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Add Bed</h2>
            <div><label className={lbl}>Bed Number *</label><input required className={field} value={form.bed_number} onChange={e => setForm(f => ({ ...f, bed_number: e.target.value }))} /></div>
            <div><label className={lbl}>Bed Type</label><select className={field} value={form.bed_type} onChange={e => setForm(f => ({ ...f, bed_type: e.target.value }))}>{BED_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label className={lbl}>Status</label><select className={field} value={form.bed_status} onChange={e => setForm(f => ({ ...f, bed_status: e.target.value }))}>{BED_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><label className={lbl}>Description</label><textarea rows={2} className={field} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : "Add Bed"}</button>
              <button type="button" onClick={() => setModalOpen(false)} className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}
      {toast && <div className="fixed bottom-5 right-5 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}
    </div>
  );
}

