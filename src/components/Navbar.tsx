import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import HoverLinks from "./HoverLinks";
import { gsap } from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import "./styles/Navbar.css";
import { portfolioData } from "../data/portfolio";

gsap.registerPlugin(ScrollSmoother, ScrollTrigger);
export let smoother: ScrollSmoother;

const Navbar = () => {
  useEffect(() => {
    smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 1.7,
      speed: 1.7,
      effects: true,
      autoResize: true,
      ignoreMobileResize: true,
    });

    smoother.scrollTop(0);
    smoother.paused(true);

    const links = Array.from(
      document.querySelectorAll(".header ul a")
    ) as HTMLAnchorElement[];

    const handleLinkClick = (event: Event) => {
      if (window.innerWidth > 1024) {
        event.preventDefault();
        const anchor = event.currentTarget as HTMLAnchorElement;
        const section = anchor.getAttribute("data-href");
        smoother.scrollTo(section, true, "top top");
      }
    };

    links.forEach((element) => element.addEventListener("click", handleLinkClick));

    const handleResize = () => {
      ScrollSmoother.refresh(true);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      links.forEach((element) =>
        element.removeEventListener("click", handleLinkClick)
      );
      window.removeEventListener("resize", handleResize);
      smoother?.kill();
    };
  }, []);

  const { meta } = portfolioData;

  return (
    <>
      <div className="header">
        <a href="/#" className="navbar-title" data-cursor="disable">
          {meta.initials}
        </a>
        <a
          href={meta.emailHref}
          className="navbar-connect"
          data-cursor="disable"
        >
          {meta.email}
        </a>
        <ul>
          <li>
            <a data-href="#about" href="#about">
              <HoverLinks text="ABOUT" />
            </a>
          </li>
          <li>
            <a data-href="#work" href="#work">
              <HoverLinks text="WORK" />
            </a>
          </li>
          <li>
            <a data-href="#contact" href="#contact">
              <HoverLinks text="CONTACT" />
            </a>
          </li>
        </ul>
      </div>

      <div className="landing-circle1"></div>
      <div className="landing-circle2"></div>
      <div className="nav-fade"></div>
    </>
  );
};

export default Navbar;
