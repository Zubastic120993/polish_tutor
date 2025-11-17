import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { LessonChatPage } from './pages/LessonChatPage'
import { LessonSummaryPage } from './components/LessonSummaryPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/lesson/lesson_mock_001" replace />} />
        <Route path="/lesson/:id" element={<LessonChatPage />} />
        <Route path="/summary" element={<LessonSummaryPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
