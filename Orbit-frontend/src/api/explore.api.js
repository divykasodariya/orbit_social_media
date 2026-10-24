import http from './http';

export const getExploreFeed = (page = 1, limit = 15) => {
    return http.get(`/explore/feed?page=${page}&limit=${limit}`);
};

export const getExploreHighlights = () => {
    return http.get('/explore/highlights');
};
