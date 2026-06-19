import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart2, Globe, Server, ArrowLeft, AlertCircle } from 'lucide-react';

export default function Benchmark() {
  const { owner, repo } = useParams();
  const [benchmark, setBenchmark] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBenchmark = async () => {
      try {
        const reposRes = await fetch(`${import.meta.env.VITE_API_URL}/api/repos`);
        const repos = await reposRes.json();
        const repository = repos.find(r => r.owner === owner && r.name === repo);
        
        if (repository) {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/benchmark/${repository.id}`);
          const data = await res.json();
          setBenchmark(data);
        }
      } catch (err) {
        console.error('Failed to fetch benchmark', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBenchmark();
  }, [owner, repo]);

  if (loading) return <div className="text-center p-8 text-slate-300">Loading Benchmark Data...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to={`/repo/${owner}/${repo}`} className="inline-flex items-center text-indigo-400 hover:text-indigo-300 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Repository
      </Link>
      
      <div className="flex items-center space-x-3 mb-6">
        <BarChart2 className="w-8 h-8 text-blue-400" />
        <h1 className="text-3xl font-bold text-white">Repository Benchmarking</h1>
      </div>

      {!benchmark?.available ? (
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 flex flex-col items-center text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Not enough benchmark data</h2>
          <p className="text-slate-400">
            {benchmark?.reason || 'We require a minimum pool of 10 repositories to provide statistically significant and privacy-preserving benchmarks.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 col-span-1 md:col-span-2 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Comparison Pool</h2>
              <div className="text-2xl font-bold text-white mt-1 flex items-center">
                {benchmark.category === 'Global' ? <Globe className="w-5 h-5 mr-2 text-blue-400"/> : <Server className="w-5 h-5 mr-2 text-indigo-400"/>}
                {benchmark.category} Category ({benchmark.poolSize} Repositories)
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Percentile</h2>
              <div className="text-4xl font-extrabold text-green-400 mt-1">Top {100 - benchmark.metrics.percentile}%</div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Repository Average Score</h2>
            <div className="text-5xl font-extrabold text-indigo-400 mb-2">{benchmark.metrics.repositoryScore}</div>
            <p className="text-sm text-slate-400">Average health score of PRs in this repository.</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Category Average Score</h2>
            <div className="text-5xl font-extrabold text-slate-300 mb-2">{benchmark.metrics.averageGlobalScore}</div>
            <p className="text-sm text-slate-400">Average health score across all {benchmark.poolSize} repositories in the pool.</p>
          </div>
          
          <div className="col-span-1 md:col-span-2 mt-4 p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg text-sm text-blue-300">
            <strong>Note:</strong> Benchmark metrics are aggregated deterministically to preserve privacy. No source code or repository names are shared.
          </div>
        </div>
      )}
    </div>
  );
}
