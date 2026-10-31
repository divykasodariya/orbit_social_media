import axios from "axios";

const messageApi = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    withCredentials: true,
});

// Fetch conversation between logged-in user and selected friend
export const getMessages = async (friendId) => {
    try {
        const response = await messageApi.get(`/messages/${friendId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching messages:", error);
        throw error;
    }
};

// Send a message to a friend
export const sendMessage = async (friendId, content) => {
    try {
        const response = await messageApi.post(`/messages/${friendId}`, {
            content,
        });

        return response.data;
    } catch (error) {
        console.error("Error sending message:", error);
        throw error;
    }
};