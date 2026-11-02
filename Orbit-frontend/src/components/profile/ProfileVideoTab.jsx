import { useEffect, useState } from "react";
import { getUserVideos } from "../../api/video.api";
import VideoCard from "../video/VideoCard";
import Loader from "../common/Loader";
import EmptyState from "../common/EmptyState";

const ProfileVideoTab = ({ userId }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getUserVideos(userId)
      .then((res) => {
        const data = res.data?.data;
        // getUserVideos may return an array or paginated object
        if (Array.isArray(data)) {
          setVideos(data);
        } else if (data?.docs) {
          setVideos(data.docs);
        } else {
          setVideos([]);
        }
      })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Loader />;

  if (!videos.length) {
    return (
      <EmptyState
        title="No videos yet"
        description="This user hasn't uploaded any videos."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-[fadeIn_0.35s_ease-out]">
      {videos.map((v) => (
        <VideoCard key={v._id} video={v} />
      ))}
    </div>
  );
};

export default ProfileVideoTab;
