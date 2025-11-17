/**
 * Centralized API Client
 * Handles all HTTP API communication with the backend
 */

class ApiClient {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl || window.location.origin;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    /**
     * Make a GET request
     * @param {string} endpoint - API endpoint (without base URL)
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} Response data
     */
    async get(endpoint, params = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });

        const response = await fetch(url, {
            method: 'GET',
            headers: this.defaultHeaders
        });

        return this.handleResponse(response);
    }

    /**
     * Make a POST request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @returns {Promise<Object>} Response data
     */
    async post(endpoint, data = {}) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: this.defaultHeaders,
            body: JSON.stringify(data)
        });

        return this.handleResponse(response);
    }

    /**
     * Make a PUT request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @returns {Promise<Object>} Response data
     */
    async put(endpoint, data = {}) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            headers: this.defaultHeaders,
            body: JSON.stringify(data)
        });

        return this.handleResponse(response);
    }

    /**
     * Make a DELETE request
     * @param {string} endpoint - API endpoint
     * @returns {Promise<Object>} Response data
     */
    async delete(endpoint) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: this.defaultHeaders
        });

        return this.handleResponse(response);
    }

    /**
     * Handle API response
     * @param {Response} response - Fetch response object
     * @returns {Promise<Object>} Parsed response data
     */
    async handleResponse(response) {
        const contentType = response.headers.get('content-type');

        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            const error = new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    }
}

/**
 * Lesson API Service
 */
export class LessonApiService {
    constructor(apiClient) {
        this.api = apiClient;
    }

    /**
     * Get lesson catalog
     * @returns {Promise<Object>} Lesson catalog data
     */
    async getCatalog() {
        return this.api.get('/api/lesson/catalog');
    }

    /**
     * Get lesson by ID
     * @param {string} lessonId - Lesson ID
     * @returns {Promise<Object>} Lesson data
     */
    async getLesson(lessonId) {
        return this.api.get('/api/lesson/get', { lesson_id: lessonId });
    }

    /**
     * Get lesson options for current dialogue
     * @param {string} lessonId - Lesson ID
     * @param {string} dialogueId - Dialogue ID
     * @returns {Promise<Object>} Lesson options data
     */
    async getOptions(lessonId, dialogueId) {
        return this.api.get('/api/lesson/options', {
            lesson_id: lessonId,
            dialogue_id: dialogueId
        });
    }

    /**
     * Generate a new lesson
     * @param {Object} lessonData - Lesson generation parameters
     * @returns {Promise<Object>} Generated lesson data
     */
    async generateLesson(lessonData) {
        return this.api.post('/api/lesson/generate', lessonData);
    }
}

/**
 * Chat API Service
 */
export class ChatApiService {
    constructor(apiClient) {
        this.api = apiClient;
    }

    /**
     * Send a chat message
     * @param {Object} messageData - Message data
     * @returns {Promise<Object>} Chat response
     */
    async sendMessage(messageData) {
        return this.api.post('/chat/respond', messageData);
    }
}

/**
 * TTS API Service
 */
export class TtsApiService {
    constructor(apiClient) {
        this.api = apiClient;
    }

    /**
     * Start text-to-speech synthesis
     * @param {Object} ttsData - TTS parameters
     * @returns {Promise<Object>} TTS job information
     */
    async speak(ttsData) {
        return this.api.post('/tts/speak', ttsData);
    }

    /**
     * Get TTS job status
     * @param {string} jobId - TTS job ID
     * @returns {Promise<Object>} Job status
     */
    async getJobStatus(jobId) {
        return this.api.get(`/tts/status/${jobId}`);
    }

    /**
     * Cancel TTS job
     * @param {string} jobId - TTS job ID
     * @returns {Promise<Object>} Cancellation result
     */
    async cancelJob(jobId) {
        return this.api.delete(`/tts/jobs/${jobId}`);
    }

    /**
     * Get available voices
     * @param {string} language - Optional language filter
     * @returns {Promise<Object>} Available voices
     */
    async getVoices(language = null) {
        return this.api.get('/tts/voices', { language });
    }

    /**
     * Get cache statistics
     * @returns {Promise<Object>} Cache stats
     */
    async getCacheStats() {
        return this.api.get('/tts/cache/stats');
    }
}

/**
 * User API Service
 */
export class UserApiService {
    constructor(apiClient) {
        this.api = apiClient;
    }

    /**
     * Get user profile
     * @param {number} userId - User ID
     * @returns {Promise<Object>} User profile data
     */
    async getProfile(userId) {
        return this.api.get(`/api/user/${userId}`);
    }

    /**
     * Update user profile
     * @param {number} userId - User ID
     * @param {Object} profileData - Profile update data
     * @returns {Promise<Object>} Updated profile data
     */
    async updateProfile(userId, profileData) {
        return this.api.put(`/api/user/${userId}`, profileData);
    }

    /**
     * Get user settings
     * @param {number} userId - User ID
     * @returns {Promise<Object>} User settings
     */
    async getSettings(userId) {
        return this.api.get(`/api/user/${userId}/settings`);
    }

    /**
     * Update user settings
     * @param {number} userId - User ID
     * @param {Object} settingsData - Settings update data
     * @returns {Promise<Object>} Updated settings
     */
    async updateSettings(userId, settingsData) {
        return this.api.put(`/api/user/${userId}/settings`, settingsData);
    }
}

/**
 * Review API Service
 */
export class ReviewApiService {
    constructor(apiClient) {
        this.api = apiClient;
    }

    /**
     * Get SRS reviews for user
     * @param {number} userId - User ID
     * @returns {Promise<Object>} SRS review data
     */
    async getReviews(userId) {
        return this.api.get('/api/review/due', { user_id: userId });
    }

    /**
     * Submit review response
     * @param {Object} reviewData - Review response data
     * @returns {Promise<Object>} Review result
     */
    async submitReview(reviewData) {
        return this.api.post('/api/review/submit', reviewData);
    }
}

/**
 * Settings API Service
 */
export class SettingsApiService {
    constructor(apiClient) {
        this.api = apiClient;
    }

    /**
     * Get user setting
     * @param {number} userId - User ID
     * @param {string} key - Setting key
     * @returns {Promise<Object>} Setting value
     */
    async getSetting(userId, key) {
        return this.api.get(`/api/settings/get`, { user_id: userId, key });
    }

    /**
     * Set user setting
     * @param {number} userId - User ID
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     * @returns {Promise<Object>} Setting result
     */
    async setSetting(userId, key, value) {
        return this.api.post('/api/settings/set', {
            user_id: userId,
            key,
            value: JSON.stringify(value)
        });
    }
}

// Create singleton API client instance
const apiClient = new ApiClient();

// Create service instances
export const lessonApi = new LessonApiService(apiClient);
export const chatApi = new ChatApiService(apiClient);
export const ttsApi = new TtsApiService(apiClient);
export const userApi = new UserApiService(apiClient);
export const reviewApi = new ReviewApiService(apiClient);
export const settingsApi = new SettingsApiService(apiClient);

// Export the base client for advanced usage
export { apiClient };
export default apiClient;
