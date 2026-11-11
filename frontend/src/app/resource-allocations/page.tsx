"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import ActionError from "@/components/shared/ActionError";
import {
  cancelResourceAllocation,
  createResourceAllocation,
  fetchResourceAllocations,
  releaseResourceAllocation,
} from "@/lib/api/resource-allocations";
import { fetchIcuResources } from "@/lib/api/icu-resources";
import { fetchAdmissions } from "@/lib/api/admissions";
import type { Admission } from "@/types/admission";
import type { IcuResource, ResourceAllocation } from "@/types/icu-resource";

const field =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const label = "text-sm font-medium text-gray-700 mb-1 block";
const statuses = ["ACTIVE", "RELEASED", "CANCELLED"] as const;
type AllocationStatus = (typeof statuses)[number];

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ResourceAllocationsPage() {
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [resources, setResources] = useState<IcuResource[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    icu_resource_id: "",
    admission_id: "",
    quantity: "1",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [allocationRows, resourceRows, admissionRows] = await Promise.all([
        fetchResourceAllocations(),
        fetchIcuResources(),
        fetchAdmissions(),
      ]);
      setAllocations(allocationRows);
      setResources(resourceRows);
      setAdmissions(admissionRows);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load resource allocations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeAdmissions = admissions.filter((admission) => admission.admission_status === "ACTIVE");
  const availableByResource = useMemo(() => {
    const activeQuantity = new Map<number, number>();
    for (const allocation of allocations) {
      if (allocation.allocation_status === "ACTIVE") {
        const id = Number(allocation.icu_resource_id);
        activeQuantity.set(id, (activeQuantity.get(id) ?? 0) + Number(allocation.quantity));
      }
    }
    return new Map(
      resources.map((resource) => [
        Number(resource.icu_resource_id),
        Math.max(0, Number(resource.quantity) - (activeQuantity.get(Number(resource.icu_resource_id)) ?? 0)),
      ]),
    );
  }, [allocations, resources]);

  const availableResources = resources.filter((resource) => (
    ["AVAILABLE", "IN_USE"].includes(resource.resource_status) &&
    (availableByResource.get(Number(resource.icu_resource_id)) ?? 0) > 0
  ));

  const filtered = allocations.filter((allocation) => {
    if (statusFilter !== "ALL" && allocation.allocation_status !== statusFilter) return false;
    if (search) {
      const query = search.toLowerCase();
      const admission = admissions.find(
        (item) => String(item.admission_id) === String(allocation.admission_id),
      );
      if (
        !allocation.resource_name.toLowerCase().includes(query) &&
        !allocation.resource_type.toLowerCase().includes(query) &&
        !(admission?.patient_name ?? "").toLowerCase().includes(query) &&
        !String(allocation.admission_id).includes(query)
      ) return false;
    }
    return true;
  });

  const openCreate = () => {
    setActionError("");
    setForm({
      icu_resource_id: availableResources[0] ? String(availableResources[0].icu_resource_id) : "",
      admission_id: "",
      quantity: "1",
      notes: "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = Number(form.quantity);
    if (!form.icu_resource_id || !form.admission_id || !Number.isInteger(quantity) || quantity <= 0) return;
    setSaving(true);
    setActionError("");
    try {
      await createResourceAllocation({
        icu_resource_id: Number(form.icu_resource_id),
        admission_id: Number(form.admission_id),
        quantity,
        notes: form.notes.trim() || undefined,
      });
      setModalOpen(false);
      showToast("Resource allocated");
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to create resource allocation.");
    } finally {
      setSaving(false);
    }
  };

  const handleRelease = async (id: number) => {
    setBusyAction(`release:${id}`);
    setActionError("");
    try {
      await releaseResourceAllocation(id);
      showToast("Resource released");
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to release resource.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm("Cancel this resource allocation?")) return;
    setBusyAction(`cancel:${id}`);
    setActionError("");
    try {
      await cancelResourceAllocation(id);
      showToast("Allocation cancelled");
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to cancel allocation.");
    } finally {
      setBusyAction(null);
    }
  };

  const counts = Object.fromEntries(
    statuses.map((status) => [
      status,
      allocations.filter((allocation) => allocation.allocation_status === status).length,
    ]),
  ) as Record<AllocationStatus, number>;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Resource Allocations"
        subtitle={`${allocations.length} allocation${allocations.length === 1 ? "" : "s"}`}
        action={
          <button
            onClick={openCreate}
            disabled={availableResources.length === 0 || activeAdmissions.length === 0}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            + Allocate Resource
          </button>
        }
      />
      <ActionError message={actionError} />

      <div className="flex flex-wrap gap-3">
        {statuses.map((status) => (
          <span key={status} className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
            {status}: {counts[status]}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search resource, admission, or patient..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="ALL">All Statuses</option>
          {statuses.map((status) => <option key={status}>{status}</option>)}
        </select>
      </div>

      {loadError ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center font-medium text-rose-700">
          {loadError}
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading resource allocations...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-100 text-left text-xs font-bold uppercase tracking-wider text-slate-800">
              <tr>
                <th className="px-4 py-3">Resource</th>
                <th className="px-4 py-3">Admission / Patient</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Allocated</th>
                <th className="px-4 py-3">Released</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center font-medium text-slate-500">No resource allocations found.</td></tr>
              ) : filtered.map((allocation) => {
                const admission = admissions.find(
                  (item) => String(item.admission_id) === String(allocation.admission_id),
                );
                const color = allocation.allocation_status === "ACTIVE"
                  ? "green"
                  : allocation.allocation_status === "CANCELLED" ? "red" : "gray";
                return (
                  <tr key={allocation.allocation_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{allocation.resource_name}</p>
                      <p className="text-xs text-slate-500">{allocation.resource_type}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">
                        {admission?.patient_name ?? `Admission #${allocation.admission_id}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        Admission #{allocation.admission_id} · {allocation.admission_status}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {allocation.quantity} {allocation.unit ?? ""}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={color}>{allocation.allocation_status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{formatDate(allocation.allocated_at)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{formatDate(allocation.released_at)}</td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-xs text-slate-500">{allocation.notes ?? "—"}</td>
                    <td className="px-4 py-3">
                      {allocation.allocation_status === "ACTIVE" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => void handleRelease(allocation.allocation_id)}
                            disabled={busyAction !== null}
                            className="rounded-lg border border-blue-500 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                          >
                            {busyAction === `release:${allocation.allocation_id}` ? "Releasing..." : "Release"}
                          </button>
                          <button
                            onClick={() => void handleCancel(allocation.allocation_id)}
                            disabled={busyAction !== null}
                            className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                          >
                            {busyAction === `cancel:${allocation.allocation_id}` ? "Cancelling..." : "Cancel"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800">Allocate ICU Resource</h2>
            <div>
              <label className={label}>Resource *</label>
              <select
                required
                className={field}
                value={form.icu_resource_id}
                onChange={(event) => setForm((current) => ({ ...current, icu_resource_id: event.target.value }))}
              >
                <option value="">Select Available Resource</option>
                {availableResources.map((resource) => (
                  <option key={resource.icu_resource_id} value={resource.icu_resource_id}>
                    {resource.resource_name} — {resource.resource_type} ({availableByResource.get(Number(resource.icu_resource_id))} {resource.unit ?? ""} available)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Active Admission *</label>
              <select
                required
                className={field}
                value={form.admission_id}
                onChange={(event) => setForm((current) => ({ ...current, admission_id: event.target.value }))}
              >
                <option value="">Select Admission</option>
                {activeAdmissions.map((admission) => (
                  <option key={admission.admission_id} value={admission.admission_id}>
                    {admission.patient_name} — #{admission.admission_id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Quantity *</label>
              <input
                required
                type="number"
                min={1}
                step={1}
                max={availableByResource.get(Number(form.icu_resource_id)) ?? undefined}
                className={field}
                value={form.quantity}
                onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
              />
            </div>
            <div>
              <label className={label}>Notes</label>
              <textarea
                rows={2}
                className={field}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || availableResources.length === 0 || activeAdmissions.length === 0}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Allocating..." : "Allocate"}
              </button>
              <button type="button" disabled={saving} onClick={() => setModalOpen(false)} className="rounded-lg bg-gray-100 px-5 py-2 text-sm text-gray-700 disabled:opacity-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-lg bg-green-600 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
