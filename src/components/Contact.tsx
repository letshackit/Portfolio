import {
  MdArrowOutward,
  MdCopyright,
  MdDescription,
  MdLocationOn,
  MdMailOutline,
  MdPhoneInTalk,
} from "react-icons/md";
import "./styles/Contact.css";
import { portfolioData } from "../data/portfolio";

const Contact = () => {
  const { meta, education, certifications, research, closingStatement } =
    portfolioData;
  const currentYear = new Date().getFullYear();

  return (
    <section className="contact-section" id="contact">
      <div className="contact-inner section-container">
        <div className="contact-container">
          {/* ── Header ── */}
          <div className="contact-hero">
            <div className="contact-copy">
              <p className="contact-kicker">Let's Connect</p>
              <h3>
                Product strategy,{" "}
                <span className="contact-accent">delivery rigor,</span>
                {" "}and AI&#8209;enabled execution.
              </h3>
              <p className="contact-lead">{closingStatement}</p>
              <div className="contact-meta">
                <span>{meta.title}</span>
                <span>{meta.subtitle}</span>
                <span>
                  <MdLocationOn style={{ verticalAlign: "middle", marginRight: 4 }} />
                  {meta.location}
                </span>
              </div>
              <div className="contact-actions">
                <a
                  href={meta.emailHref}
                  className="contact-primary"
                  data-cursor="disable"
                >
                  Email Me <MdArrowOutward />
                </a>
                <a
                  href={meta.resumePath}
                  target="_blank"
                  rel="noreferrer"
                  className="contact-secondary"
                  data-cursor="disable"
                >
                  View Resume <MdDescription />
                </a>
              </div>
            </div>

            <div className="contact-spotlight">
              <p className="contact-panel-label">Direct Channels</p>
              <div className="contact-method-list">
                <a
                  href={meta.emailHref}
                  className="contact-method"
                  data-cursor="disable"
                >
                  <div className="contact-method-main">
                    <span className="contact-method-icon">
                      <MdMailOutline />
                    </span>
                    <div className="contact-method-copy">
                      <strong>Email</strong>
                      <small>{meta.email}</small>
                    </div>
                  </div>
                  <MdArrowOutward className="contact-method-arrow" />
                </a>
                <a
                  href={meta.phoneHref}
                  className="contact-method"
                  data-cursor="disable"
                >
                  <div className="contact-method-main">
                    <span className="contact-method-icon">
                      <MdPhoneInTalk />
                    </span>
                    <div className="contact-method-copy">
                      <strong>Phone</strong>
                      <small>{meta.phone}</small>
                    </div>
                  </div>
                  <MdArrowOutward className="contact-method-arrow" />
                </a>
                <a
                  href={meta.locationHref}
                  target="_blank"
                  rel="noreferrer"
                  className="contact-method"
                  data-cursor="disable"
                >
                  <div className="contact-method-main">
                    <span className="contact-method-icon">
                      <MdLocationOn />
                    </span>
                    <div className="contact-method-copy">
                      <strong>Location</strong>
                      <small>{meta.location}</small>
                    </div>
                  </div>
                  <MdArrowOutward className="contact-method-arrow" />
                </a>
              </div>
            </div>
          </div>

          {/* ── Cards Grid ── */}
          <div className="contact-grid">
            <article className="contact-card">
              <p className="contact-card-label">Education</p>
              <div className="contact-stack">
                {education.map((item) => (
                  <div className="contact-stack-item" key={item}>
                    {item}
                  </div>
                ))}
              </div>
            </article>

            <article className="contact-card">
              <p className="contact-card-label">Selected Certifications</p>
              <div className="contact-chip-list">
                {certifications.map((item) => (
                  <span className="contact-chip" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </article>

            <article className="contact-card contact-card-feature">
              <p className="contact-card-label">Research</p>
              <h4>{research.title}</h4>
              <p className="contact-card-copy">{research.publication}</p>
              <a
                href={research.href}
                target="_blank"
                rel="noreferrer"
                data-cursor="disable"
                className="contact-link"
              >
                Read Publication <MdArrowOutward />
              </a>
            </article>
          </div>

          {/* ── Footer ── */}
          <div className="contact-footer">
            <p>{closingStatement}</p>
            <h5>
              <MdCopyright /> {currentYear} <span>{meta.name}</span>
            </h5>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
