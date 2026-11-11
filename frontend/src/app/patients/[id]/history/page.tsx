"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import Badge from "@/components/shared/Badge";
import { fetchPatientById } from "@/lib/api/patients";
import { API_BASE } from "@/lib/utils/constants";
import { formatDate } from "@/lib/utils/formatDate";
import type { Patient } from "@/types/patient";

interface Admission {
  admission_id: number;
  admission_number: string;
  admission_date: string;
  discharge_date: string | null;
  status: string;
  bed_number?: string;
  ward_name?: string;
}

export default function PatientHistoryPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await fetchPatientById(Number(id));
      setPatient(p);
    } catch { /* ignore */ }
    try {
      const res = await fetch(`${API_BASE}/admissions?patient_id=${id}`);
      const json = await res.json();
      if (json.success) setAdmissions(json.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        title={patient ? `Admission History — ${patient.first_name} ${patient.last_name}` : "Admission History"}
        subtitle={patient?.patient_number ?? ""}
        action={
          <button onClick={() => router.push(`/patients/${id}`)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">← Back</button>
        }
      />
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : admissions.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No admission records found for this patient.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Admission #</th>
                <th className="text-left px-4 py-3">Admitted On</th>
                <th className="text-left px-4 py-3">Bed</th>
                <th className="text-left px-4 py-3">Ward</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Discharged On</th>
              </tr>
            </thead>
            <tbody>
              {admissions.map(a => (
                <tr key={a.admission_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.admission_number}</td>
                  <td className="px-4 py-3">{formatDate(a.admission_date)}</td>
                  <td className="px-4 py-3">{a.bed_number ?? "—"}</td>
                  <td className="px-4 py-3">{a.ward_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge label={a.status} color={a.status === "ACTIVE" ? "green" : a.status === "DISCHARGED" ? "gray" : "amber"} />
                  </td>
                  <td className="px-4 py-3 text-gray-400">{a.discharge_date ? formatDate(a.discharge_date) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

