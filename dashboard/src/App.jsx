import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import RepoDetail from './pages/RepoDetail';
import ReviewDetail from './pages/ReviewDetail';
import Analytics from './pages/Analytics';
import Leaderboard from './pages/Leaderboard';
import Insights from './pages/Insights';
import ReleaseNotes from './pages/ReleaseNotes';

import TechDebt from './pages/TechDebt';
import Benchmark from './pages/Benchmark';

export default function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/repo/:id" element={<RepoDetail />} />
          <Route path="/review/:id" element={<ReviewDetail />} />
          <Route path="/analytics/:repoId" element={<Analytics />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/insights/:repoId" element={<Insights />} />
          <Route path="/release-notes/:repoId" element={<ReleaseNotes />} />
          <Route path="/tech-debt/:owner/:repo" element={<TechDebt />} />
          <Route path="/benchmark/:owner/:repo" element={<Benchmark />} />
        </Routes>
      </main>
    </div>
  );
}
