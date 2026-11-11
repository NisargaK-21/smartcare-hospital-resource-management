"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import ActionError from "@/components/shared/ActionError";
import {
  createIcuResource,
  fetchIcuBeds,
  fetchIcuResources,
  updateIcuResource,
} from "@/lib/api/icu-resources";
import type { Bed } from "@/types/bed";
import type { IcuResource, ResourceStatus } from "@/types/icu-resource";

const field =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const label = "text-sm font-medium text-gray-700 mb-1 block";
const resourceTypes = [
  "VENTILATOR",
  "CARDIAC_MONITOR",
  "INFUSION_PUMP",
  "PATIENT_MONITOR",
  "OXYGEN_SUPPLY",
  "OTHER",
];
const resourceStatuses: ResourceStatus[] = [
  "AVAILABLE",
  "IN_USE",
  "MAINTENANCE",
  "OUT_OF_SERVICE",
];
const statusColor: Record<ResourceStatus, "green" | "blue" | "amber" | "red"> = {
  AVAILABLE: "green",
  IN_USE: "blue",
  MAINTENANCE: "amber",
  OUT_OF_SERVICE: "red",
};

interface ResourceForm {
  bed_id: string;
  resource_type: string;
  resource_name: string;
  quantity: string;
  unit: string;
  notes: string;
}

const emptyForm: ResourceForm = {
  bed_id: "",
  resource_type: "VENTILATOR",
  resource_name: "",
  quantity: "1",
  unit: "UNIT",
  notes: "",
};

export default function IcuResourcesPage() {
  const [resources, setResources] = useState<IcuResource[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [activeTab, setActiveTab] = useState<"resources" | "beds">("resources");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IcuResource | null>(null);
  const [form, setForm] = useState<ResourceForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [resourceRows, bedRows] = await Promise.all([
        fetchIcuResources(),
        fetchIcuBeds(),
      ]);
      setResources(resourceRows);
      setBeds(bedRows);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load ICU resources.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      bed_id: String(beds.find((bed) => bed.is_active)?.bed_id ?? ""),
    });
    setActionError("");
    setModalOpen(true);
  };

  const openEdit = (resource: IcuResource) => {
    setEditing(resource);
    setForm({
      bed_id: String(resource.bed_id),
      resource_type: resource.resource_type,
      resource_name: resource.resource_name,
      quantity: String(resource.quantity),
      unit: resource.unit ?? "UNIT",
      notes: resource.notes ?? "",
    });
    setActionError("");
    setModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setActionError("");
    const data = {
      bed_id: Number(form.bed_id),
      resource_type: form.resource_type,
      resource_name: form.resource_name.trim(),
      quantity: Number(form.quantity),
      unit: form.unit.trim(),
      notes: form.notes.trim() || undefined,
    };

    try {
      if (editing) {
        await updateIcuResource(editing.icu_resource_id, data);
        showToast("ICU resource updated");
      } else {
        await createIcuResource(data);
        showToast("ICU resource created");
      }
      setModalOpen(false);
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to save ICU resource.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (resource: IcuResource, status: ResourceStatus) => {
    setUpdatingId(resource.icu_resource_id);
    setActionError("");
    try {
      await updateIcuResource(resource.icu_resource_id, { resource_status: status });
      showToast(`Resource marked ${status.replaceAll("_", " ").toLowerCase()}`);
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update resource status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const tabClass = (tab: "resources" | "beds") =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
      activeTab === tab
        ? "bg-blue-600 text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  const activeBeds = beds.filter((bed) => bed.is_active);

  return (
    <div className="space-y-5">
      <PageHeader
        title="ICU Resource Management"
        subtitle={`${resources.length} resource${resources.length === 1 ? "" : "s"} · ${beds.length} ICU bed${beds.length === 1 ? "" : "s"}`}
        action={
          activeTab === "resources" ? (
            <button
              onClick={openCreate}
              disabled={activeBeds.length === 0}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              + Add Resource
            </button>
          ) : null
        }
      />

      <ActionError message={actionError} />

      <div className="flex gap-2">
        <button className={tabClass("resources")} onClick={() => setActiveTab("resources")}>
          ICU Resources
        </button>
        <button className={tabClass("beds")} onClick={() => setActiveTab("beds")}>
          ICU Beds
        </button>
      </div>

      {loadError ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center font-medium text-rose-700">
          {loadError}
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center font-medium text-slate-500">
          Loading ICU resource data...
        </div>
      ) : activeTab === "resources" ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-100 text-left text-xs font-bold uppercase tracking-wider text-slate-800">
              <tr>
                <th className="px-4 py-3">Resource</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">ICU Bed</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resources.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center font-medium text-slate-500">
                    No ICU resources found.
                  </td>
                </tr>
              ) : (
                resources.map((resource) => {
                  const workflowManaged = resource.resource_status === "IN_USE" ||
                    resource.resource_status === "MAINTENANCE";
                  return (
                    <tr key={resource.icu_resource_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">{resource.resource_name}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-600">{resource.resource_type}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {resource.bed_number}
                        <span className="ml-1 text-xs text-slate-400">
                          ({resource.room_number}, {resource.ward_name})
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {resource.quantity} {resource.unit ?? ""}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <Badge color={statusColor[resource.resource_status]}>
                            {resource.resource_status}
                          </Badge>
                          <select
                            aria-label={`Set status for ${resource.resource_name}`}
                            value={resource.resource_status}
                            disabled={workflowManaged || updatingId === resource.icu_resource_id}
                            onChange={(event) =>
                              void handleStatusChange(
                                resource,
                                event.target.value as ResourceStatus,
                              )
                            }
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs disabled:bg-slate-100"
                          >
                            {workflowManaged && (
                              <option value={resource.resource_status}>
                                Managed by {resource.resource_status === "IN_USE" ? "allocations" : "maintenance"}
                              </option>
                            )}
                            <option value="AVAILABLE">AVAILABLE</option>
                            <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
                          </select>
                        </div>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-xs text-slate-500">
                        {resource.notes ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openEdit(resource)}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-200"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {activeBeds.length === 0 && (
            <p className="border-t border-slate-100 p-4 text-sm text-amber-800">
              Add or activate an ICU bed before creating an ICU resource.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-100 text-left text-xs font-bold uppercase tracking-wider text-slate-800">
              <tr>
                <th className="px-4 py-3">Bed</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Ward</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {beds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center font-medium text-slate-500">
                    No ICU beds found.
                  </td>
                </tr>
              ) : (
                beds.map((bed) => (
                  <tr key={bed.bed_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{bed.bed_number}</td>
                    <td className="px-4 py-3"><Badge>{bed.bed_status}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge color={bed.is_active ? "green" : "gray"}>
                        {bed.is_active ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{bed.room_number ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{bed.ward_name ?? "—"}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-xs text-slate-500">
                      {bed.description ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-800">
              {editing ? "Edit ICU Resource" : "Add ICU Resource"}
            </h2>
            <div>
              <label className={label}>ICU Bed *</label>
              <select
                required
                className={field}
                value={form.bed_id}
                onChange={(event) => setForm((current) => ({ ...current, bed_id: event.target.value }))}
              >
                <option value="">Select Active ICU Bed</option>
                {activeBeds.map((bed) => (
                  <option key={bed.bed_id} value={bed.bed_id}>
                    {bed.bed_number} — {bed.room_number}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Resource Name *</label>
              <input
                required
                maxLength={100}
                className={field}
                value={form.resource_name}
                onChange={(event) => setForm((current) => ({ ...current, resource_name: event.target.value }))}
              />
            </div>
            <div>
              <label className={label}>Resource Type *</label>
              <select
                required
                className={field}
                value={form.resource_type}
                onChange={(event) => setForm((current) => ({ ...current, resource_type: event.target.value }))}
              >
                {resourceTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Quantity *</label>
                <input
                  required
                  type="number"
                  min={1}
                  step={1}
                  className={field}
                  value={form.quantity}
                  onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                />
              </div>
              <div>
                <label className={label}>Unit *</label>
                <input
                  required
                  maxLength={20}
                  className={field}
                  value={form.unit}
                  onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
                />
              </div>
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
                disabled={saving || activeBeds.length === 0}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Resource"}
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg bg-gray-100 px-5 py-2 text-sm text-gray-700"
              >
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
