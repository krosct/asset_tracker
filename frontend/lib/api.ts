import axios from "axios"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor to handle 401 and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    const isLoginRequest = originalRequest.url?.includes("/auth/login")

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry && !isLoginRequest) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem("refresh_token")

        if (!refreshToken) {
          // No refresh token, logout
          localStorage.removeItem("access_token")
          localStorage.removeItem("refresh_token")
          window.location.href = "/login"
          return Promise.reject(error)
        }

        // Call refresh endpoint
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        })

        const { access_token } = response.data

        // Update token in localStorage
        localStorage.setItem("access_token", access_token)

        // Update authorization header
        originalRequest.headers.Authorization = `Bearer ${access_token}`

        // Retry the original request
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, logout
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        window.location.href = "/login"
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)
