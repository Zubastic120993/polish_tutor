import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { LessonChatPage } from './pages/LessonChatPage'
import { LessonSummaryPage } from './pages/LessonSummaryPage'
import { DailyPracticePage } from './pages/DailyPracticePage'
import { PracticeSummaryPage } from './pages/PracticeSummaryPage'
import { WeeklyStatsPage } from './pages/WeeklyStatsPage'
import { BadgeGalleryPage } from './pages/BadgeGalleryPage'
import { BadgeHistoryPage } from './pages/BadgeHistoryPage'
import { ProfilePage } from './pages/ProfilePage'
import ShareProfilePage from './pages/ShareProfilePage'
import ShareAchievementPage from './pages/ShareAchievementPage'
import ShareWeeklySummaryPage from './pages/ShareWeeklySummaryPage'
import { AchievementQueueProvider } from './hooks/useAchievementQueue'
import { DEFAULT_LESSON_ID } from './constants/lessons'

function App() {
  return (
    <AchievementQueueProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to={`/lesson/${DEFAULT_LESSON_ID}`} replace />} />
          <Route path="/lesson/:id" element={<LessonChatPage />} />
          <Route path="/summary" element={<LessonSummaryPage />} />
          <Route path="/practice" element={<DailyPracticePage />} />
          <Route path="/practice-summary" element={<PracticeSummaryPage />} />
          <Route path="/weekly-stats" element={<WeeklyStatsPage />} />
          <Route path="/badges" element={<BadgeGalleryPage />} />
          <Route path="/badge-history" element={<BadgeHistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/share/profile" element={<ShareProfilePage />} />
          <Route path="/share/achievement/:code" element={<ShareAchievementPage />} />
          <Route path="/share/weekly-summary" element={<ShareWeeklySummaryPage />} />
        </Routes>
      </BrowserRouter>
    </AchievementQueueProvider>
  )
}

export default App
