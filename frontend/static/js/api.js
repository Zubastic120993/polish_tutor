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

        // Authentication state
        this.accessToken = localStorage.getItem('access_token');
        this.refreshToken = localStorage.getItem('refresh_token');
        this.isRefreshing = false;
        this.refreshPromise = null;
    }

    /**
     * Set authentication tokens
     * @param {string} accessToken - JWT access token
     * @param {string} refreshToken - JWT refresh token
     */
    setTokens(accessToken, refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;

        if (accessToken) {
            localStorage.setItem('access_token', accessToken);
        }
        if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
        }
    }

    /**
     * Clear authentication tokens
     */
    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }

    /**
     * Get authorization header
     * @returns {Object} Headers object with authorization if available
     */
    getAuthHeaders() {
        const headers = { ...this.defaultHeaders };
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        return headers;
    }

    /**
     * Refresh access token using refresh token
     * @returns {Promise<Object>} New token data
     */
    async refreshAccessToken() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        // Prevent multiple concurrent refresh requests
        if (this.isRefreshing) {
            return this.refreshPromise;
        }

        this.isRefreshing = true;

        this.refreshPromise = fetch(`${this.baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: this.defaultHeaders,
            body: JSON.stringify({
                refresh_token: this.refreshToken
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success' && data.data?.tokens) {
                const tokens = data.data.tokens;
                this.setTokens(tokens.access_token, tokens.refresh_token);
                return tokens;
            } else {
                throw new Error(data.message || 'Token refresh failed');
            }
        })
        .finally(() => {
            this.isRefreshing = false;
            this.refreshPromise = null;
        });

        return this.refreshPromise;
    }

    /**
     * Make a GET request
     * @param {string} endpoint - API endpoint (without base URL)
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} Response data
     */
    async get(endpoint, params = {}) {
        return this.request('GET', endpoint, null, params);
    }

    /**
     * Make a POST request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @returns {Promise<Object>} Response data
     */
    async post(endpoint, data = {}) {
        return this.request('POST', endpoint, data);
    }

    /**
     * Make a PUT request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @returns {Promise<Object>} Response data
     */
    async put(endpoint, data = {}) {
        return this.request('PUT', endpoint, data);
    }

    /**
     * Make a DELETE request
     * @param {string} endpoint - API endpoint
     * @returns {Promise<Object>} Response data
     */
    async delete(endpoint) {
        return this.request('DELETE', endpoint);
    }

    /**
     * Make an authenticated HTTP request with automatic token refresh
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} Response data
     */
    async request(method, endpoint, data = null, params = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`);

        // Add query parameters
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });

        const requestOptions = {
            method: method,
            headers: this.getAuthHeaders()
        };

        // Add body for non-GET requests
        if (data && method !== 'GET') {
            requestOptions.body = JSON.stringify(data);
        }

        let response = await fetch(url, requestOptions);

        // If unauthorized, try to refresh token and retry once
        if (response.status === 401 && this.refreshToken) {
            try {
                await this.refreshAccessToken();
                // Retry with new token
                requestOptions.headers = this.getAuthHeaders();
                response = await fetch(url, requestOptions);
            } catch (refreshError) {
                // Refresh failed, clear tokens and throw original error
                this.clearTokens();
                const error = new Error('Authentication failed');
                error.status = 401;
                error.data = { message: 'Session expired. Please log in again.' };
                throw error;
            }
        }

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
        return this.api.get('/api/review/get', { user_id: userId });
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

/**
 * Authentication API Service
 */
export class AuthApiService {
    constructor(apiClient) {
        this.api = apiClient;
    }

    /**
     * Login user
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Promise<Object>} Login response with tokens
     */
    async login(username, password) {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${this.api.baseUrl}/auth/login`, {
            method: 'POST',
            body: formData
        });

        const data = await this.api.handleResponse(response);

        // Store tokens if login successful
        if (data.status === 'success' && data.data?.tokens) {
            const tokens = data.data.tokens;
            this.api.setTokens(tokens.access_token, tokens.refresh_token);
        }

        return data;
    }

    /**
     * Logout user
     * @returns {Promise<Object>} Logout response
     */
    async logout() {
        try {
            await this.api.post('/auth/logout');
        } catch (error) {
            // Ignore logout errors, just clear local tokens
            console.warn('Logout API call failed:', error);
        }

        // Always clear local tokens
        this.api.clearTokens();

        return {
            status: 'success',
            message: 'Logged out successfully',
            data: null
        };
    }

    /**
     * Refresh access token
     * @returns {Promise<Object>} Token refresh response
     */
    async refreshToken() {
        const data = await this.api.refreshAccessToken();
        return {
            status: 'success',
            message: 'Token refreshed successfully',
            data: { tokens: data }
        };
    }

    /**
     * Get current user information
     * @returns {Promise<Object>} User information
     */
    async getCurrentUser() {
        return this.api.get('/auth/me');
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} True if user has valid access token
     */
    isAuthenticated() {
        return !!this.api.accessToken;
    }

    /**
     * Get stored access token
     * @returns {string|null} Access token or null
     */
    getAccessToken() {
        return this.api.accessToken;
    }

    /**
     * Get stored refresh token
     * @returns {string|null} Refresh token or null
     */
    getRefreshToken() {
        return this.api.refreshToken;
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
export const authApi = new AuthApiService(apiClient);

// Export the base client for advanced usage
export { apiClient };
export default apiClient;
