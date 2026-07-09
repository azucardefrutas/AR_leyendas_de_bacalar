import React from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-coverflow';

// Coverflow carousel of legends (the reader's collection or a discover shelf).
// Each story is { id, title, slug, coverUrl }. The active slide reveals its
// title + a CTA that opens the legend's page. Clicking a card navigates to the
// legend detail (its "dashboard").
function initials(title = '') {
  return title.trim().slice(0, 2).toUpperCase() || 'LB';
}

export default function LegendCarousel({ stories = [], ctaLabel = 'Abrir' }) {
  if (!stories.length) return null;

  return (
    <div className="rx-cw">
      <Swiper
        grabCursor
        centeredSlides
        slidesPerView="auto"
        loop={stories.length > 2}
        pagination={{ clickable: true }}
        effect="coverflow"
        coverflowEffect={{ rotate: 0, stretch: 0, depth: 120, modifier: 3, slideShadows: true }}
        modules={[Pagination, EffectCoverflow]}
      >
        {stories.map((story) => (
          <SwiperSlide
            key={story.id}
            className="rx-cw-slide"
            style={story.coverUrl ? { backgroundImage: `url("${story.coverUrl}")` } : undefined}
          >
            {!story.coverUrl && <span className="rx-cw-fallback">{initials(story.title)}</span>}
            <div className="rx-cw-cap">
              <h3>{story.title}</h3>
              <Link to={`/legend/${story.slug}`}>{ctaLabel}</Link>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
