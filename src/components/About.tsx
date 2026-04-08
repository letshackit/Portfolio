import "./styles/About.css";
import { portfolioData } from "../data/portfolio";

const About = () => {
  return (
    <div className="about-section" id="about">
      <div className="about-me">
        <h3 className="title">About Me</h3>
        <p className="para">{portfolioData.about}</p>
      </div>
    </div>
  );
};

export default About;
