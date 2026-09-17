import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CampaignPage from './pages/CampaignPage';
import GamePage from './pages/GamePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/campaign" element={<CampaignPage />} />
      <Route path="/game/campaign/:difficulty/:level" element={<GamePage mode="campaign" />} />
      <Route path="/game/daily" element={<GamePage mode="daily" />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}
