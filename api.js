import axios from "axios";

const instance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});


export default instance;
