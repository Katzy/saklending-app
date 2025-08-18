import React from "react";

function About() {
  return (
    <div className="about-container">
      <h2>About Us</h2>
      <div className="about-bio">
        <img src="/headshot.jpg" alt="Scott Katz" className="headshot" />
        <div className="bio-text">
          <p>
            Scott Katz graduated from UCLA with a degree in international economics, where he developed a love for both finance and travel. He brings over two decades of financial market and mortgage experience to his clients. Somewhere in all the chaos of debt placement lives the exact loan that makes sense for each client's specific needs. "If I can’t find it, it probably doesn’t exist!"
          </p>
        </div>
      </div>
    </div>
  );
}

export default About;