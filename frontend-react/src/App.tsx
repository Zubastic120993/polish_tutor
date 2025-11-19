import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { LessonChatPage } from './pages/LessonChatPage'
import { LessonSummaryPage } from './pages/LessonSummaryPage'
import { AchievementQueueProvider } from './hooks/useAchievementQueue'

function App() {
  return (
    <AchievementQueueProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/lesson/lesson_mock_001" replace />} />
          <Route path="/lesson/:id" element={<LessonChatPage />} />
          <Route path="/summary" element={<LessonSummaryPage />} />
        </Routes>
      </BrowserRouter>
    </AchievementQueueProvider>
  )
}

export default App
