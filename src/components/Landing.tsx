import { PropsWithChildren } from "react";
import "./styles/Landing.css";
import { portfolioData } from "../data/portfolio";

const Landing = ({ children }: PropsWithChildren) => {
  const { landing } = portfolioData;

  return (
    <>
      <div className="landing-section" id="landingDiv">
        <div className="landing-container">
          <div className="landing-intro">
            <h2>{landing.greeting}</h2>
            <h1>
              {landing.firstName}
              <br />
              <span>{landing.lastName}</span>
            </h1>
          </div>
          <div className="landing-info">
            <h3>{landing.lead}</h3>
            <h2 className="landing-info-h2">
              <div className="landing-h2-1">{landing.accentPrimary}</div>
              <div className="landing-h2-2">{landing.accentSecondary}</div>
            </h2>
            <h2>
              <div className="landing-h2-info">{landing.basePrimary}</div>
              <div className="landing-h2-info-1">{landing.baseSecondary}</div>
            </h2>
          </div>
        </div>
        {children}
      </div>
    </>
  );
};

export default Landing;
