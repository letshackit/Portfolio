import { useState, useCallback, useRef, useEffect } from "react";
import "./styles/Work.css";
import { MdArrowBack, MdArrowForward } from "react-icons/md";
import { portfolioData } from "../data/portfolio";

const Work = () => {
  const projects = portfolioData.highlights;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideWidth, setSlideWidth] = useState(0);
  const [entered, setEntered] = useState(false);
  const [contentKey, setContentKey] = useState(0); // triggers re-animation on slide change
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Measure the container width so translateX is always pixel-exact
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setSlideWidth(containerRef.current.offsetWidth);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Intersection observer — triggers entrance animation when section scrolls into view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const goToSlide = useCallback(
    (index: number) => {
      if (isAnimating) return;
      setIsAnimating(true);
      setCurrentIndex(index);
      setContentKey((k) => k + 1); // bump key → re-runs CSS entrance animation
      setTimeout(() => setIsAnimating(false), 500);
    },
    [isAnimating]
  );

  const goToPrev = useCallback(() => {
    const newIndex =
      currentIndex === 0 ? projects.length - 1 : currentIndex - 1;
    goToSlide(newIndex);
  }, [currentIndex, goToSlide, projects.length]);

  const goToNext = useCallback(() => {
    const newIndex =
      currentIndex === projects.length - 1 ? 0 : currentIndex + 1;
    goToSlide(newIndex);
  }, [currentIndex, goToSlide, projects.length]);

  const progressPct = ((currentIndex + 1) / projects.length) * 100;

  return (
    <div
      className={`work-section${entered ? " work-entered" : ""}`}
      id="work"
      ref={sectionRef}
    >
      <div className="work-container section-container">
        {/* ── Heading with animated underline ── */}
        <div className="work-heading-wrap">
          <h2 className="work-heading">
            Selected <span>Highlights</span>
          </h2>
          <div className="work-heading-line" />
        </div>

        <div className="carousel-wrapper">
          <div className="carousel-track-container" ref={containerRef}>
            <div
              className="carousel-track"
              style={{
                transform: `translateX(-${currentIndex * slideWidth}px)`,
              }}
            >
              {projects.map((project, index) => {
                const isActive = index === currentIndex;
                return (
                  <div className="carousel-slide" key={index}>
                    <div
                      className="carousel-content"
                      /* key forces remount of animated children on slide change */
                      key={isActive ? `active-${contentKey}` : `idle-${index}`}
                    >
                      {/* ── Left: Info + Controls ── */}
                      <div className="carousel-info">
                        <div className="carousel-number">
                          <h3 className={isActive ? "num-animate" : ""}>
                            0{index + 1}
                          </h3>
                        </div>
                        <div className="carousel-details">
                          <h4 className={isActive ? "slide-in-up delay-1" : ""}>
                            {project.title}
                          </h4>
                          <p
                            className={`carousel-category${isActive ? " slide-in-up delay-2" : ""}`}
                          >
                            {project.category}
                          </p>
                          <div
                            className={`carousel-tools${isActive ? " slide-in-up delay-3" : ""}`}
                          >
                            <span className="tools-label">Focus</span>
                            <p>{project.focus}</p>
                          </div>
                          <div
                            className={`carousel-nav${isActive ? " slide-in-up delay-4" : ""}`}
                          >
                            <button
                              className="carousel-arrow"
                              onClick={goToPrev}
                              aria-label="Previous project"
                              data-cursor="disable"
                            >
                              <MdArrowBack />
                            </button>
                            <div className="carousel-dots">
                              {projects.map((_, i) => (
                                <button
                                  key={i}
                                  className={`carousel-dot${i === currentIndex ? " carousel-dot-active" : ""}`}
                                  onClick={() => goToSlide(i)}
                                  aria-label={`Go to project ${i + 1}`}
                                  data-cursor="disable"
                                />
                              ))}
                            </div>
                            <button
                              className="carousel-arrow"
                              onClick={goToNext}
                              aria-label="Next project"
                              data-cursor="disable"
                            >
                              <MdArrowForward />
                            </button>
                            <span className="carousel-counter">
                              {String(currentIndex + 1).padStart(2, "0")} /{" "}
                              {String(projects.length).padStart(2, "0")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── Right: Detail Panel ── */}
                      <div
                        className={`carousel-panel${isActive ? " panel-enter" : ""}`}
                      >
                        <p
                          className={`carousel-summary${isActive ? " fade-in-up delay-1" : ""}`}
                        >
                          {project.summary}
                        </p>
                        <div className="carousel-metrics">
                          {project.metrics.map((metric, mi) => (
                            <div
                              className={`carousel-metric${isActive ? ` metric-pop delay-${mi + 1}` : ""}`}
                              key={`${project.title}-${metric.label}`}
                            >
                              <strong>{metric.value}</strong>
                              <span>{metric.label}</span>
                            </div>
                          ))}
                        </div>
                        <ul className="carousel-highlights">
                          {project.bullets.map((bullet, bi) => (
                            <li
                              className={isActive ? `fade-in-up delay-${bi + 3}` : ""}
                              key={bullet}
                            >
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="carousel-progress">
            <div
              className="carousel-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Work;
