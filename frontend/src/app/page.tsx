"use client";

import { useEffect, useState } from "react";

interface Stats {
  total_beds: number;
  available_beds: number;
  occupied_beds: number;
  reserved_beds: number;
  maintenance_beds: number;
  total_patients: number;
  total_staff: number;
  total_departments: number;
  total_wards: number;
  occupancy_rate: number;
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5000/api/dashboard/stats")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStats(json.data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const cards = stats
    ? [
        { label: "Total Beds",        value: stats.total_beds,        color: "bg-blue-100 text-blue-800" },
        { label: "Available Beds",    value: stats.available_beds,    color: "bg-green-100 text-green-800" },
        { label: "Occupied Beds",     value: stats.occupied_beds,     color: "bg-red-100 text-red-800" },
        { label: "Reserved Beds",     value: stats.reserved_beds,     color: "bg-yellow-100 text-yellow-800" },
        { label: "Maintenance Beds",  value: stats.maintenance_beds,  color: "bg-gray-100 text-gray-700" },
        { label: "Total Patients",    value: stats.total_patients,    color: "bg-purple-100 text-purple-800" },
        { label: "Active Staff",      value: stats.total_staff,       color: "bg-teal-100 text-teal-800" },
        { label: "Departments",       value: stats.total_departments,  color: "bg-indigo-100 text-indigo-800" },
        { label: "Total Wards",       value: stats.total_wards,       color: "bg-orange-100 text-orange-800" },
        { label: "Occupancy Rate",    value: `${stats.occupancy_rate ?? 0}%`, color: "bg-pink-100 text-pink-800" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">🏥 SmartCare Hospital</h1>
        <p className="text-gray-500 text-sm mt-1">Resource Management Dashboard</p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-20 text-gray-400 text-sm">Loading...</div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-20 text-red-400 text-sm">
          Could not connect to backend. Make sure the server is running on port 5000.
        </div>
      )}

      {/* Stats Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className={`rounded-xl p-5 ${card.color} flex flex-col gap-1`}
            >
              <span className="text-xs font-medium opacity-70">{card.label}</span>
              <span className="text-2xl font-bold">{card.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

