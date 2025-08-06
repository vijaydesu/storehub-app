import axios from "axios";


// const API_BASE_URL = "http://52.87.135.1:8080";
const API_HOST = process.env.REACT_APP_API_HOST;
const API_PORT = process.env.REACT_APP_API_PORT;
const API_URL = `http://${API_HOST}:${API_PORT}`;

const apiService = {
  healthCheck: async () => {
    try {
      const response = await axios.get(`${API_URL}/healthcheck`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default apiService;
