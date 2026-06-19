import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { ShieldAlert, Activity, ArrowLeft } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function TechDebt() {
  const { owner, repo } = useParams();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTechDebt = async () => {
      try {
        // Find repository ID first
        const reposRes = await fetch(`${import.meta.env.VITE_API_URL}/api/repos`);
        const repos = await reposRes.json();
        const repository = repos.find(r => r.owner === owner && r.name === repo);
        
        if (repository) {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/techdebt/${repository.id}`);
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error('Failed to fetch tech debt', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTechDebt();
  }, [owner, repo]);

  if (loading) return <div className="text-center p-8 text-slate-300">Loading Tech Debt Data...</div>;

  const currentSnapshot = history.length > 0 ? history[history.length - 1] : null;

  const chartData = {
    labels: history.map(h => new Date(h.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Tech Debt Score',
        data: history.map(h => h.debtScore),
        borderColor: '#f87171',
        backgroundColor: 'rgba(248, 113, 113, 0.5)',
        tension: 0.3,
      }
    ]
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Link to={`/repo/${owner}/${repo}`} className="inline-flex items-center text-indigo-400 hover:text-indigo-300 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Repository
      </Link>
      
      <div className="flex items-center space-x-3 mb-6">
        <ShieldAlert className="w-8 h-8 text-red-400" />
        <h1 className="text-3xl font-bold text-white">Technical Debt Tracker</h1>
      </div>

      {!currentSnapshot ? (
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center">
          <p className="text-slate-400">No tech debt history available. The nightly cron has not run yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Current Debt Score</h2>
            <div className="text-5xl font-extrabold text-red-400 mb-2">{currentSnapshot.debtScore}</div>
            <p className="text-sm text-slate-400">Lower is better. Accumulated penalty points from unresolved critical and warning issues over 90 days.</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
            <h2 className="text-xl font-bold text-white">Primary Causes</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-900 p-3 rounded-lg">
                <span className="text-slate-300">Missing Tests</span>
                <span className="font-bold text-red-400">{currentSnapshot.missingTestsPct}%</span>
              </div>
              <div className="flex justify-between items-center bg-slate-900 p-3 rounded-lg">
                <span className="text-slate-300">Large Functions</span>
                <span className="font-bold text-yellow-400">{currentSnapshot.largeFunctionsCount} detected</span>
              </div>
              <div className="flex justify-between items-center bg-slate-900 p-3 rounded-lg">
                <span className="text-slate-300">Duplicate Logic</span>
                <span className="font-bold text-yellow-400">{currentSnapshot.duplicateLogicCount} instances</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700 text-sm">
              <span className="text-slate-400">Estimated Remediation Effort: </span>
              <span className="font-bold text-white">{Math.ceil(currentSnapshot.debtScore / 2)} Hours</span>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 md:col-span-2">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-indigo-400" />
              90-Day Trend
            </h2>
            <div className="h-64">
              <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
