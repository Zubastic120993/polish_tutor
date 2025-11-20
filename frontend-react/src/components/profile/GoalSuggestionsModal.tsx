import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProfileResponse } from '../../types/profile';

interface GoalSuggestionsModalProps {
  profileStats: ProfileResponse;
  username: string;
  currentGoal?: string | null;
  onSelectSuggestion: (text: string) => void;
  onClose: () => void;
}

export function GoalSuggestionsModal({
  profileStats,
  username,
  currentGoal,
  onSelectSuggestion,
  onClose,
}: GoalSuggestionsModalProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Fetch suggestions from OpenAI
  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoading(true);
      setError(null);

      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        setError('OpenAI API key not configured');
        setLoading(false);
        return;
      }

      try {
        // Get best badge names for context
        const badgeNames = profileStats.best_badges.map((b) => b.name).join(', ') || 'None yet';

        const prompt = `You are a motivational Polish language learning coach. Generate 4-6 personalized, specific, and achievable learning goals for this learner.

User Profile:
- Username: ${username}
- Level: ${profileStats.level}
- Total XP: ${profileStats.total_xp}
- Current Streak: ${profileStats.current_streak} days
- Total Sessions: ${profileStats.total_sessions}
- Best Achievements: ${badgeNames}
${currentGoal ? `- Current Goal: "${currentGoal}"` : '- No current goal set'}

Requirements:
- Goals should be specific and measurable
- Mix of short-term (daily/weekly) and longer-term goals
- Include variety: practice time, streak building, XP targets, level progression
- Keep each goal under 60 characters
- Be encouraging and motivational
- Use action-oriented language

Return ONLY a JSON array of goal strings, nothing else. Example format:
["Practice Polish 15 minutes daily", "Reach Level 10 by end of month", "Build a 30-day streak"]`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful Polish language learning coach who generates personalized learning goals. Return only valid JSON arrays.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.8,
            max_tokens: 300,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error('No response from OpenAI');
        }

        // Parse the JSON array from the response
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSuggestions(parsed);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
        setError('Unable to generate suggestions. Try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [profileStats, username, currentGoal]);

  const handleSelectSuggestion = (suggestion: string) => {
    onSelectSuggestion(suggestion);
    onClose();
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Trigger re-fetch by updating a dependency
    window.location.reload();
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition text-2xl"
            aria-label="Close"
          >
            ✕
          </button>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">✨ AI Goal Suggestions</h2>
            <p className="mt-1 text-sm text-slate-500">Based on your progress</p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                  className="h-12 w-full rounded-full bg-slate-200"
                />
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mb-6">
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
                <p className="text-red-700 font-medium">{error}</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleRetry}
                  className="mt-3 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-600 transition"
                >
                  Retry
                </motion.button>
              </div>
            </div>
          )}

          {/* Suggestions List */}
          {!loading && !error && suggestions.length > 0 && (
            <div className="space-y-3 mb-6">
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full rounded-full bg-slate-100 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-200 transition text-left"
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-slate-400">
            <p>Powered by OpenAI</p>
            <p className="mt-1">Press ESC to close</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  // Render to portal
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) {
    console.error('modal-root element not found');
    return null;
  }

  return createPortal(modalContent, modalRoot);
}

