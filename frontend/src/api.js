// Local dev: uses Vite proxy (/api → localhost:8000)
// Production: uses VITE_API_URL env variable
const API = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}`
  : '/api'

export default API
