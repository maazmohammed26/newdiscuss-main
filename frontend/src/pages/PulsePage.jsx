import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToPulseFeed, togglePulseLike, checkIfLiked } from '@/lib/pulseDb';
import PulseFeed from '@/components/PulseFeed';
import { IoArrowBack, IoAdd } from 'react-icons/io5';
import LoadingScreen from '@/components/LoadingScreen';

const PulsePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pulses, setPulses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToPulseFeed((data) => {
      // Randomly shuffle the videos
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setPulses(shuffled);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return <LoadingScreen message="Loading Pulse videos, please wait..." />;
  }

  return (
    <div className="pulse-page">
      <div className="pulse-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack size={24} />
        </button>
        <span className="pulse-title" onClick={handleRefresh}>Pulse</span>
        <button className="add-pulse-btn" onClick={() => navigate('/feed', { state: { openPulseUpload: true } })}>
          <IoAdd size={28} />
        </button>
      </div>

      <PulseFeed 
        pulses={pulses} 
        userId={user?.uid} 
        onLike={togglePulseLike}
        checkLiked={checkIfLiked}
        onRefresh={handleRefresh}
      />
    </div>
  );
};

export default PulsePage;
