"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import ActionError from "@/components/shared/ActionError";
import { fetchBeds, createBed, updateBed, deactivateBed, activateBed } from "@/lib/api/beds";
import { fetchWards } from "@/lib/api/wards";
import { fetchRooms } from "@/lib/api/rooms";
import type { Bed } from "@/types/bed";
import type { Ward } from "@/types/ward";
import type { Room } from "@/types/room";
import { BED_STATUSES, BED_TYPES } from "@/lib/utils/constants";

const field = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "text-sm font-medium text-gray-700 mb-1 block";

const statusColor: Record<string, "green" | "red" | "amber" | "gray"> = {
  AVAILABLE: "green", OCCUPIED: "red", RESERVED: "amber", MAINTENANCE: "gray",
};

export default function BedsPage() {
  const router = useRouter();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [wardFilter, setWardFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ bed_number: "", bed_type: "STANDARD", bed_status: "AVAILABLE", description: "", room_id: "", ward_id: "" });
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [b, w, r] = await Promise.all([fetchBeds(), fetchWards(), fetchRooms()]);
      setBeds(b); setWards(w); setRooms(r);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load beds.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (form.ward_id) setFilteredRooms(rooms.filter(r => String(r.ward_id) === form.ward_id));
    else setFilteredRooms([]);
  }, [form.ward_id, rooms]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const openAdd = () => { setActionError(""); setForm({ bed_number: "", bed_type: "STANDARD", bed_status: "AVAILABLE", description: "", room_id: "", ward_id: "" }); setModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setActionError("");
    try {
      await createBed({ bed_number: form.bed_number, bed_type: form.bed_type as Bed["bed_type"], bed_status: form.bed_status as Bed["bed_status"], description: form.description, room_id: Number(form.room_id) });
      showToast("Bed created"); setModalOpen(false); await load();
    } catch (err) { setActionError(err instanceof Error ? err.message : "Error creating bed"); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (id: number, bed_status: string) => {
    setBusyAction(`status:${id}`);
    setActionError("");
    try {
      await updateBed(id, { bed_status: bed_status as Bed["bed_status"] });
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update bed status.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!window.confirm("Deactivate this bed?")) return;
    setBusyAction(`deactivate:${id}`);
    setActionError("");
    try {
      await deactivateBed(id);
      showToast("Bed deactivated");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error deactivating bed");
    } finally {
      setBusyAction(null);
    }
  };

  const handleActivate = async (id: number) => {
    setBusyAction(`activate:${id}`);
    setActionError("");
    try {
      await activateBed(id);
      showToast("Bed activated");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error activating bed");
    } finally {
      setBusyAction(null);
    }
  };

  const filtered = beds.filter(b => {
    if (statusFilter !== "ALL" && b.bed_status !== statusFilter) return false;
    if (typeFilter !== "ALL" && b.bed_type !== typeFilter) return false;
    if (wardFilter !== "ALL" && b.ward_name !== wardFilter) return false;
    return true;
  });

  const counts = { AVAILABLE: 0, OCCUPIED: 0, RESERVED: 0, MAINTENANCE: 0, CLEANING: 0 };
  filtered.forEach(b => { if (b.bed_status in counts) counts[b.bed_status as keyof typeof counts]++; });

  const uniqueWards = [...new Set(beds.map(b => b.ward_name).filter(Boolean))];

  return (
    <div className="space-y-5">
      <PageHeader title="Bed Inventory" subtitle={`${filtered.length} beds`} action={
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Bed</button>
      } />
      <ActionError message={actionError} />

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        {(["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE", "CLEANING"] as const).map(s => (
          <span key={s} className={`px-3 py-1 rounded-full text-xs font-bold border ${s === "AVAILABLE" ? "bg-emerald-100 text-emerald-900 border-emerald-300" : s === "OCCUPIED" ? "bg-rose-100 text-rose-900 border-rose-300" : s === "RESERVED" ? "bg-amber-100 text-amber-900 border-amber-300" : s === "CLEANING" ? "bg-blue-100 text-blue-900 border-blue-300" : "bg-slate-100 text-slate-800 border-slate-300"}`}>
            {s}: {counts[s]}
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="ALL">All Statuses</option>
          {BED_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="ALL">All Types</option>
          {BED_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={wardFilter} onChange={e => setWardFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="ALL">All Wards</option>
          {uniqueWards.map(w => <option key={w}>{w}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-500 font-medium">Loading beds...</div> : loadError ? (
          <div role="alert" className="p-8 text-center font-medium text-rose-600">{loadError}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3">Bed #</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Activity</th>
                <th className="text-left px-4 py-3">Room</th>
                <th className="text-left px-4 py-3">Ward</th>
                <th className="text-left px-4 py-3">Department</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? <tr><td colSpan={8} className="text-center py-10 text-slate-500 font-medium">No beds match the selected filters</td></tr>
                : filtered.map(b => (
                  <tr key={b.bed_id} className={`hover:bg-slate-50 transition-colors ${b.is_active ? "" : "bg-slate-50/70"}`}>
                    <td className="px-4 py-3 font-bold text-slate-900">{b.bed_number}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700 text-xs">{b.bed_type}</td>
                    <td className="px-4 py-3">
                      <select value={b.bed_status} disabled={busyAction !== null} onChange={e => handleStatusChange(b.bed_id, e.target.value)} className="border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white disabled:opacity-50">
                        {BED_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${b.is_active ? "bg-emerald-100 text-emerald-900 border-emerald-300" : "bg-slate-100 text-slate-700 border-slate-300"}`}>
                        {b.is_active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{b.room_number}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{b.ward_name}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-medium">{b.department_name}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => router.push(`/beds/${b.bed_id}`)} className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold">View</button>
                      {b.is_active && <button disabled={busyAction !== null} onClick={() => handleDeactivate(b.bed_id)} className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">{busyAction === `deactivate:${b.bed_id}` ? "Deactivating..." : "Deactivate"}</button>}
                      {!b.is_active && <button disabled={busyAction !== null} onClick={() => handleActivate(b.bed_id)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">{busyAction === `activate:${b.bed_id}` ? "Activating..." : "Activate"}</button>}
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
            <h2 className="text-lg font-semibold text-gray-800">Add Bed</h2>
            <div>
              <label className={lbl}>Ward *</label>
              <select required className={field} value={form.ward_id} onChange={e => setForm(f => ({ ...f, ward_id: e.target.value, room_id: "" }))}>
                <option value="">Select Ward</option>
                {wards.map(w => <option key={w.ward_id} value={w.ward_id}>{w.ward_name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Room *</label>
              <select required className={field} value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))} disabled={!form.ward_id}>
                <option value="">Select Room</option>
                {filteredRooms.map(r => <option key={r.room_id} value={r.room_id}>{r.room_number}</option>)}
              </select>
            </div>
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
