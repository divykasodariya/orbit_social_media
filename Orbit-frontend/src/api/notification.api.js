import http from './http';

export const getNotifications = () => {
    return http.get('/notifications');
};

export const markAsRead = (id) => {
    return http.patch(`/notifications/${id}/read`);
};

export const markAllAsRead = () => {
    return http.patch('/notifications/read-all');
};
