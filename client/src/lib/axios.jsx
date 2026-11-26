import axios from "axios";
export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// export const axiosInstance = axios.create({
//   baseURL: `${window.location.origin.replace(/:\d+$/, ":5000")}/api`,
//   withCredentials: true,
// });
