import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { LessonChatPage } from './pages/LessonChatPage'
import { LessonSummaryPage } from './pages/LessonSummaryPage'
import { DailyPracticePage } from './pages/DailyPracticePage'
import { PracticeSummaryPage } from './pages/PracticeSummaryPage'
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
        </Routes>
      </BrowserRouter>
    </AchievementQueueProvider>
  )
}

export default App
