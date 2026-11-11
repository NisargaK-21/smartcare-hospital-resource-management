"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import SearchBar from "@/components/shared/SearchBar";
import Badge from "@/components/shared/Badge";
import { fetchPatients, searchPatients, deactivatePatient } from "@/lib/api/patients";
import type { Patient } from "@/types/patient";

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPatients();
      setPatients(data);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (search.trim()) {
        const data = await searchPatients(search.trim()).catch(() => []);
        setPatients(data);
      } else {
        load();
      }
    }, 300);
  }, [search, load]);

  const filtered = genderFilter === "ALL" ? patients : patients.filter(p => p.gender === genderFilter);

  const handleDeactivate = async (id: number) => {
    if (!window.confirm("Deactivate this patient?")) return;
    await deactivatePatient(id).catch(() => {});
    load();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Patients"
        subtitle={`${filtered.length} records`}
        action={
          <button onClick={() => router.push("/patients/register")} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Register Patient
          </button>
        }
      />
      <div className="flex gap-3 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or patient number..." />
        <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="ALL">All Genders</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Patient #</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Gender</th>
                <th className="text-left px-4 py-3">Blood Group</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No patients found</td></tr>
              ) : filtered.map(p => (
                <tr key={p.patient_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.patient_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.first_name} {p.last_name}</td>
                  <td className="px-4 py-3"><Badge label={p.gender} color={p.gender === "MALE" ? "blue" : p.gender === "FEMALE" ? "purple" : "gray"} /></td>
                  <td className="px-4 py-3">{p.blood_group ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{p.phone}</td>
                  <td className="px-4 py-3"><Badge label={p.is_active ? "Active" : "Inactive"} color={p.is_active ? "green" : "red"} /></td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => router.push(`/patients/${p.patient_id}`)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium">View</button>
                    {p.is_active && <button onClick={() => handleDeactivate(p.patient_id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium">Deactivate</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

