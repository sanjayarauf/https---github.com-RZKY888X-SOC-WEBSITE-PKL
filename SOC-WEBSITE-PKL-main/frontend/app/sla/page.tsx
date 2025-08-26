"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

type SLAEntry = {
  timestamp: string;
  status: "Up" | "Down";
};

type SLAData = {
  "1day": SLAEntry[];
  "7days": SLAEntry[];
  "30days": SLAEntry[];
};

const PAGE_SIZE = 6;

// Fungsi buat dummy uptime sekitar 75-85%
function generateDummyData(days: number): SLAEntry[] {
  const result: SLAEntry[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);

    const entries = 10; // tetap jumlah
    const upCount = Math.floor(Math.random() * 3) + 7; // antara 7-9 "Up"
    for (let j = 0; j < entries; j++) {
      result.push({
        timestamp: new Date(date.getTime() + j * 3600000).toISOString(),
        status: j < upCount ? "Up" : "Down",
      });
    }
  }

  return result;
}

const SLAChart = () => {
  const [slaData, setSlaData] = useState<SLAData | null>(null);
  const [selectedRange, setSelectedRange] = useState<"1day" | "7days" | "30days">("7days");
  const [chartData, setChartData] = useState<any[]>([]);
  const [uptimePercentage, setUptimePercentage] = useState<number>(0);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    const dummy: SLAData = {
      "1day": generateDummyData(1),
      "7days": generateDummyData(7),
      "30days": generateDummyData(30),
    };
    setSlaData(dummy);
  }, []);

  useEffect(() => {
    if (!slaData) return;
    const data = slaData[selectedRange];

    const grouped: Record<string, { up: number; down: number; rawDate: Date }> = {};

    for (const entry of data) {
      const dateObj = new Date(entry.timestamp);
      const dateStr = dateObj.toLocaleDateString("id-ID");

      if (!grouped[dateStr]) {
        grouped[dateStr] = { up: 0, down: 0, rawDate: dateObj };
      }

      if (entry.status === "Up") grouped[dateStr].up++;
      else grouped[dateStr].down++;
    }

    const chart = Object.entries(grouped)
      .map(([date, { up, down, rawDate }]) => {
        const total = up + down;
        const uptime = total > 0 ? (up / total) * 100 : 0;
        return {
          date,
          uptime: Number(uptime.toFixed(2)),
          rawDate,
        };
      })
      .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

    const totalUptime = chart.reduce((sum, d) => sum + d.uptime, 0);
    const avgUptime = chart.length ? totalUptime / chart.length : 0;

    setChartData(chart);
    setUptimePercentage(Number(avgUptime.toFixed(2)));
    setPageIndex(0);
  }, [slaData, selectedRange]);

  const paginatedData =
    selectedRange === "30days"
      ? chartData.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE)
      : chartData;

  const totalPages =
    selectedRange === "30days" ? Math.ceil(chartData.length / PAGE_SIZE) : 1;

  return (
    <div className="bg-[#0f172a] text-white rounded-xl p-6 space-y-6 shadow-lg min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Rekap SLA</h2>
        <div className="flex justify-center gap-3 mb-4">
          <label htmlFor="range">Pilih Range:</label>
          <select
            id="range"
            value={selectedRange}
            onChange={(e) =>
              setSelectedRange(e.target.value as "1day" | "7days" | "30days")
            }
            className="bg-gray-800 border border-gray-600 px-2 py-1 rounded"
          >
            <option value="1day">1 Hari</option>
            <option value="7days">7 Hari</option>
            <option value="30days">30 Hari</option>
          </select>
        </div>
        <div className="relative w-24 h-24 mx-auto mb-4">
          <svg viewBox="0 0 36 36" className="w-full h-full">
            <path
              className="text-gray-600"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-green-400"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${uptimePercentage}, 100`}
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold">
            {uptimePercentage}%
          </div>
        </div>
        <p
          className={`font-semibold ${
            uptimePercentage >= 90 ? "text-green-400" : "text-red-400"
          }`}
        >
          {uptimePercentage >= 90 ? "Sesuai Standar" : "Tidak Sesuai"}
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">SLA Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={paginatedData}>
            <defs>
              <linearGradient id="slaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="p-3 bg-[#1e293b] text-white border border-green-500 rounded-md">
                      <p className="text-sm font-bold">{label}</p>
                      <p className="text-sm">Uptime: {payload[0].value}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="uptime"
              stroke="#22c55e"
              fill="url(#slaGradient)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
            />
            {/* Garis horizontal SLA standar 90% dengan warna oranye terang */}
            <ReferenceLine
              y={90}
              stroke="#f97316" // orange-500
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                position: "right",
                value: "Standar SLA 90%",
                fill: "#f97316",
                fontSize: 12,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>

        {selectedRange === "30days" && (
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
              disabled={pageIndex === 0}
              className="px-4 py-1 bg-gray-700 rounded disabled:opacity-30"
            >
              Prev
            </button>
            <span>
              Halaman {pageIndex + 1} dari {totalPages}
            </span>
            <button
              onClick={() =>
                setPageIndex((prev) => Math.min(prev + 1, totalPages - 1))
              }
              disabled={pageIndex >= totalPages - 1}
              className="px-4 py-1 bg-gray-700 rounded disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SLAChart;
