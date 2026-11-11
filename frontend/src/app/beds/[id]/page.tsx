"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import { fetchBedById, updateBed, deactivateBed } from "@/lib/api/beds";
import type { Bed } from "@/types/bed";
import { BED_STATUSES, BED_TYPES } from "@/lib/utils/constants";

const field = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const statusColor: Record<string, "green" | "red" | "amber" | "gray"> = {
  AVAILABLE: "green", OCCUPIED: "red", RESERVED: "amber", MAINTENANCE: "gray",
};

export default function BedDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [bed, setBed] = useState<Bed | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [newType, setNewType] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const b = await fetchBedById(Number(id)).catch(() => null);
    setBed(b);
    if (b) { setNewStatus(b.bed_status); setNewType(b.bed_type); setDescription(b.description ?? ""); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleUpdate = async (data: object) => {
    setSaving(true);
    await updateBed(Number(id), data).catch(() => {});
    showToast("Bed updated"); load(); setSaving(false);
  };

  const handleDeactivate = async () => {
    if (!window.confirm("Deactivate this bed?")) return;
    await deactivateBed(Number(id)).catch(() => {});
    router.push("/beds");
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (!bed) return <div className="p-8 text-center text-red-400">Bed not found</div>;

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader title={`Bed ${bed.bed_number}`} subtitle={`${bed.room_number} · ${bed.ward_name}`} action={
        <div className="flex gap-2">
          {bed.is_active && <button onClick={handleDeactivate} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium">Deactivate</button>}
          <button onClick={() => router.back()} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">← Back</button>
        </div>
      } />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Info */}
        <div className="grid grid-cols-2 gap-4">
          {[
            ["Bed Number", bed.bed_number],
            ["Room", bed.room_number ?? "—"],
            ["Ward", bed.ward_name ?? "—"],
            ["Department", bed.department_name ?? "—"],
          ].map(([l, v]) => (
            <div key={l}><p className="text-xs text-gray-500">{l}</p><p className="font-medium text-gray-800">{v}</p></div>
          ))}
          <div>
            <p className="text-xs text-gray-500">Current Status</p>
            <Badge label={bed.bed_status} color={statusColor[bed.bed_status] ?? "gray"} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Bed Type</p>
            <p className="font-medium text-gray-800">{bed.bed_type}</p>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Status Update */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Update Status</p>
          <div className="flex gap-2">
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className={field}>
              {BED_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <button disabled={saving} onClick={() => handleUpdate({ bed_status: newStatus })} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">Update</button>
          </div>
        </div>

        {/* Type Update */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Update Bed Type</p>
          <div className="flex gap-2">
            <select value={newType} onChange={e => setNewType(e.target.value)} className={field}>
              {BED_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <button disabled={saving} onClick={() => handleUpdate({ bed_type: newType })} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">Update</button>
          </div>
        </div>

        {/* Description Update */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
          <div className="flex gap-2">
            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className={`flex-1 ${field}`} />
            <button disabled={saving} onClick={() => handleUpdate({ description })} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium self-start disabled:opacity-50">Save</button>
          </div>
        </div>
      </div>
      {toast && <div className="fixed bottom-5 right-5 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}
    </div>
  );
}

