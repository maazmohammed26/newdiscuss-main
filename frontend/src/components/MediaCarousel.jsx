import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import './MediaCarousel.css';

const MediaCarousel = ({ media, onMediaClick }) => {
  if (!media || media.length === 0) return null;

  return (
    <div className="media-carousel-container">
      <Swiper
        modules={[Pagination, Navigation]}
        spaceBetween={10}
        slidesPerView={1}
        pagination={{ clickable: true }}
        navigation={media.length > 1}
        className="post-media-swiper"
      >
        {media.map((item, index) => (
          <SwiperSlide key={index} onClick={() => onMediaClick?.(item, index)}>
            <div className="media-slide">
              {item.type === 'video' || item.url.includes('video') ? (
                <video src={item.url} controls={false} muted loop playsInline />
              ) : (
                <img src={item.url} alt={`Post media ${index}`} loading="lazy" />
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default MediaCarousel;
