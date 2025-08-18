import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import { DateTime } from "luxon";

function About() {
  return (
    <div className="about-container">
      <h2>About Us</h2>
      <p className="intro-paragraph">
        SAK Lending provides clients with an end to end guidance during the complete loan process. Each loan requires a nuanced approach and our goal is to shield you from stress of the loan process while acquiring you the best rates available. If your loan doesn't fund, we don't get paid.
      </p>
      <div className="about-bio">
        <img src="/headshot.jpg" alt="Scott Katz" className="headshot" />
        <div className="bio-text">
          <p>
            Scott Katz founded SAK Lending to provide bespoke financing solutions for commercial real estate projects. With over 15 years of experience in the lending industry, Scott has built a reputation for securing competitive rates and terms for his clients, navigating complex transactions with ease. His commitment to transparency and client success drives SAK Lending’s mission to simplify the loan process while maximizing value.
          </p>
        </div>
      </div>
    </div>
  );
}

function Contact() {
  const [contactData, setContactData] = useState({
    name: "",
    message: "",
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const handleContactChange = (e) => {
    setContactData({ ...contactData, [e.target.name]: e.target.value });
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    fetch(`${process.env.REACT_APP_API_URL}/api/send-contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contactData),
    })
      .then((res) => res.json())
      .then((data) => {
        setContactSubmitted(true);
        setContactData({ name: "", message: "" });
        alert(data.message);
      })
      .catch((err) => {
        console.error("Error sending contact email:", err);
        alert("Failed to send message. Please try again later.");
      });
  };

  return (
    <div className="contact-container">
      <h2>Contact Us</h2>
      {contactSubmitted ? (
        <div className="thank-you-message">
          <p>Thank you for your message. We will get back to you soon! -SAK Lending Team</p>
        </div>
      ) : (
        <form onSubmit={handleContactSubmit} className="form contact-form">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={contactData.name}
              onChange={handleContactChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Message</label>
            <textarea
              name="message"
              value={contactData.message}
              onChange={handleContactChange}
              rows="5"
              required
            />
          </div>
          <button type="submit">Send Message</button>
        </form>
      )}
      <div className="contact-info">
        <p>Email: info@saklending.com | Phone: (401) 677-7359</p>
      </div>
    </div>
  );
}

function App() {
  const [rates, setRates] = useState([]);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    loanAmount: "",
    propertyType: "",
    loanType: "",
    state: "",
    comments: "",
  });
  const [calculatorData, setCalculatorData] = useState({
    loanAmount: "",
    interestRate: "",
    loanTerm: "",
  });
  const [calculatorResults, setCalculatorResults] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState("New Purchase");

  const usStates = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
    "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
    "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
    "Wisconsin", "Wyoming"
  ];

  const loanTypes = [
    "New Purchase",
    "Ground Up Construction",
    "Fix and Flip",
    "SBA",
    "Bridge Loan",
    "Private Money",
    "Refinance"
  ];

  const loanDescriptions = {
    "New Purchase": {
      title: "New Purchase Loan",
      description: "Our New Purchase Loan is designed for acquiring commercial properties, offering competitive rates and flexible terms to help you secure your investment. Ideal for businesses looking to expand their real estate portfolio, this loan provides streamlined financing with customized repayment options to suit your financial goals."
    },
    "Ground Up Construction": {
      title: "Ground Up Construction Loan",
      description: "Ground Up Construction Loans support the development of new commercial projects from the ground up. These loans provide funding for land acquisition, construction costs, and related expenses, with tailored disbursement schedules to align with your project milestones."
    },
    "Fix and Flip": {
      title: "Fix and Flip Loan",
      description: "Fix and Flip Loans are tailored for investors looking to purchase, renovate, and resell commercial properties for profit. These short-term loans offer flexible terms and quick funding to support rapid project turnaround, helping you maximize returns on your investment."
    },
    "SBA": {
      title: "SBA Loan",
      description: "Our SBA Loans, backed by the Small Business Administration, offer low interest rates and long repayment terms for small businesses. Ideal for purchasing real estate, equipment, or working capital, these loans provide affordable financing to support your business growth."
    },
    "Bridge Loan": {
      title: "Bridge Loan",
      description: "Bridge Loans provide short-term financing to bridge the gap between immediate capital needs and long-term funding solutions. Perfect for time-sensitive opportunities, these loans offer quick access to funds with flexible repayment options for commercial real estate transactions."
    },
    "Private Money": {
      title: "Private Money Loan",
      description: "Private Money Loans offer fast, flexible financing for unique or non-traditional commercial real estate projects. Sourced from private investors, these loans provide quick approvals and customized terms, ideal for borrowers needing expedited funding or facing unconventional lending scenarios."
    },
    "Refinance": {
      title: "Refinance Loan",
      description: "Refinance Loans allow you to replace existing commercial property loans with better terms, lower rates, or adjusted repayment schedules. Ideal for optimizing your financing structure, these loans help reduce costs and improve cash flow for your real estate investments."
    }
  };

  useEffect(() => {
  const series = [
    { id: "DPRIME", name: "PRIME RATE" },
    { id: "SOFR", name: "SOFR" },
    { id: "SOFRTERM1M", name: "1 MO TERM SOFR", placeholder: true },
    { id: "SOFRTERM6M", name: "6 MO TERM SOFR", placeholder: true },
    { id: "SOFR30DAYAVG", name: "30 DAY AVG SOFR" },
    { id: "SOFRSWAP5YR", name: "5 YR ANN SWAP SOFR", placeholder: true },
    { id: "SOFRSWAP7YR", name: "7 YR ANN SWAP SOFR", placeholder: true },
    { id: "SOFRSWAP10YR", name: "10 YR ANN SWAP SOFR", placeholder: true },
    { id: "DGS3", name: "3 YR TREASURY" },
    { id: "DGS5", name: "5 YR TREASURY" },
    { id: "DGS7", name: "7 YR TREASURY" },
    { id: "DGS10", name: "10 YR TREASURY" },
    { id: "DGS30", name: "30 YR TREASURY" },
    { id: "DGS1", name: "1 YR CMT" },
    { id: "DGS5", name: "5 YR CMT" },
    { id: "DGS7", name: "7 YR CMT" },
    { id: "DGS10", name: "10 YR CMT" },
  ];

  const fetchRates = async () => {
    try {
      localStorage.removeItem("sakLendingRates");
      let newRates = series.map(({ name }) => ({
        name,
        today: "N/A",
        thirtyDaysAgo: "N/A",
      }));
      const apiKey = "5ad79840506fa5e2ad9a94a13b1066b3";
      const today = DateTime.local().setZone("America/New_York");
      const dayOfWeek = today.weekday;
      let endDate = today;
      if (dayOfWeek === 7) {
        endDate = today.minus({ days: 2 });
      } else if (dayOfWeek === 6) {
        endDate = today.minus({ days: 1 });
      }
      endDate = DateTime.min(endDate, DateTime.fromISO("2025-08-15"));
      const endDateStr = endDate.toISODate();
      const thirtyDaysAgo = endDate.minus({ days: 30 });
      const thirtyDaysAgoStr = thirtyDaysAgo.toISODate();
      for (const { id, name, placeholder } of series) {
        if (placeholder) {
          newRates = newRates.map(rate =>
            rate.name === name ? { name, today: "N/A", thirtyDaysAgo: "N/A" } : rate
          );
          continue;
        }
        try {
          const response = await fetch(
            `${process.env.REACT_APP_API_URL}/api/rates?series_id=${id}&api_key=${apiKey}&start=${thirtyDaysAgoStr}&end=${endDateStr}`
          );
          if (!response.ok) {
            console.warn(`API error for ${id}: ${response.status} ${response.statusText}`);
            continue;
          }
          const data = await response.json();
          const observations = data.observations || [];
          if (!observations.length) {
            console.warn(`No data returned for ${id}`);
            continue;
          }
          const validObservations = observations.filter(
            obs => obs.value !== "." && !isNaN(parseFloat(obs.value))
          );
          if (!validObservations.length) {
            console.warn(`No data for ${id} (all values are invalid)`);
            continue;
          }
          validObservations.sort((a, b) => new Date(b.date) - new Date(a.date));
          const todayValue = validObservations[0].value;
          const thirtyDaysAgoValue = validObservations.find(
            obs => obs.date <= thirtyDaysAgoStr
          )?.value || "N/A";
          newRates = newRates.map(rate =>
            rate.name === name
              ? {
                  name,
                  today: todayValue ? `${parseFloat(todayValue).toFixed(3)}%` : "N/A",
                  thirtyDaysAgo: thirtyDaysAgoValue ? `${parseFloat(thirtyDaysAgoValue).toFixed(3)}%` : "N/A"
                }
              : rate
          );
          localStorage.setItem("sakLendingRates", JSON.stringify(newRates));
        } catch (error) {
          console.warn(`Error fetching ${id}: ${error.message}`);
          continue;
        }
      }
      setRates(newRates);
    } catch (error) {
      console.error("Failed to fetch rates:", error);
      setRates(series.map(({ name }) => ({ name, today: "N/A", thirtyDaysAgo: "N/A" })));
    }
  };
  fetchRates();
}, []);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCalculatorChange = (e) => {
    setCalculatorData({ ...calculatorData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    fetch(`${process.env.REACT_APP_API_URL}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then((res) => res.json())
      .then((data) => {
        setFormSubmitted(true);
        setFormData({
          firstName: "",
          lastName: "",
          phone: "",
          email: "",
          loanAmount: "",
          propertyType: "",
          loanType: "",
          state: "",
          comments: "",
        });
        alert(data.message);
      })
      .catch((err) => {
        console.error("Error sending email:", err);
        alert("Failed to send email. Please try again later.");
      });
  };

  const handleCalculatorSubmit = (e) => {
    e.preventDefault();
    const principal = parseFloat(calculatorData.loanAmount);
    const interest = parseFloat(calculatorData.interestRate) / 100 / 12;
    const payments = parseFloat(calculatorData.loanTerm) * 12;
    const x = Math.pow(1 + interest, payments);
    const monthlyPI = (principal * x * interest) / (x - 1);
    const monthlyInterestOnly = principal * interest;
    if (isFinite(monthlyPI)) {
      setCalculatorResults({
        monthlyPI: monthlyPI.toFixed(2),
        monthlyInterestOnly: monthlyInterestOnly.toFixed(2),
      });
    } else {
      alert("Please check your numbers");
    }
  };

  const toggleCalculator = () => {
    setShowCalculator(!showCalculator);
    setCalculatorResults(null);
    setCalculatorData({ loanAmount: "", interestRate: "", loanTerm: "" });
    setFormSubmitted(false);
  };

  const handleQuoteLink = () => {
    setShowCalculator(false);
    setFormSubmitted(false);
  };

  const getThankYouMessage = () => {
    const now = DateTime.local().setZone("America/New_York");
    const isWeekend = now.weekday === 6 || now.weekday === 7;
    const isFridayAfterNoon = now.weekday === 5 && now.hour >= 12;
    const isWeekdayBeforeNoon = !isWeekend && now.weekday !== 5 && now.hour < 12;

    let message = "Thank you for your inquiry. Your business and your time are important to us. ";
    if (isWeekdayBeforeNoon) {
      message += "One of our team will reach out to you by end of business today.";
    } else if (!isWeekend && !isFridayAfterNoon) {
      message += "One of our team will reach out to you within 24 hours.";
    } else {
      message += "We will reach out to you on Monday!";
    }
    message += " -SAK Lending Team";
    return message;
  };

  return (
    <Router>
      <div className="container">
        <header className="header">
          <div className="logo-container">
            <img src="/logo.jpg" alt="SAK Lending Logo" className="header-logo" />
          </div>
          <nav className="nav">
            <Link to="/">Home</Link>
            <Link to="/about">About Us</Link>
            <Link to="/products">Loan Products</Link>
            <Link to="/contact">Contact Us</Link>
            <Link to="/quote" onClick={handleQuoteLink}>Get Quote</Link>
            <Link to="/calculator" onClick={toggleCalculator}>Loan Calculator</Link>
          </nav>
        </header>
        <main className="main">
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <div className="image-rates-wrapper">
                    <section className="image-section">
                      <img src="/office1.jpg" alt="Corporate Building" className="office-image" />
                      <div className="image-text">
                        <h2>Expert Lending Solutions</h2>
                        <p>"Unlock your business potential with tailored financing."</p>
                        <p>"Competitive rates, personalized service."</p>
                      </div>
                    </section>
                    <section className="rates-section-wrapper">
                      <div className="rates-table-container">
                        <table className="rates-table">
                          <thead>
                            <tr>
                              <th>Rate Name</th>
                              <th>Today</th>
                              <th>30 Days Ago</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rates
                              .filter(rate => rate.today !== "N/A")
                              .map((rate, index) => (
                                <tr key={index}>
                                  <td>{rate.name}</td>
                                  <td>{rate.today}</td>
                                  <td>{rate.thirtyDaysAgo}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                    <div className="disclaimer-wrapper">
                      <p className="disclaimer">Last updated: {new Date().toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="form-wrapper">
                    <section className="form-section" id={showCalculator ? "calculator" : "quote"}>
                      <h2>{showCalculator ? "Loan Calculator" : formSubmitted ? "Inquiry Sent" : "Request a Quote"}</h2>
                      {showCalculator ? (
                        <form onSubmit={handleCalculatorSubmit} className="form calculator-form">
                          <div className="form-group">
                            <label>Loan Amount ($)</label>
                            <input
                              type="number"
                              name="loanAmount"
                              value={calculatorData.loanAmount}
                              onChange={handleCalculatorChange}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Interest Rate (%)</label>
                            <input
                              type="number"
                              name="interestRate"
                              value={calculatorData.interestRate}
                              onChange={handleCalculatorChange}
                              step="0.1"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Loan Term (Years)</label>
                            <input
                              type="number"
                              name="loanTerm"
                              value={calculatorData.loanTerm}
                              onChange={handleCalculatorChange}
                              required
                            />
                          </div>
                          <button type="submit">Calculate</button>
                          {calculatorResults && (
                            <div className="calculator-results">
                              <h3>Monthly Payments</h3>
                              <p>Principal & Interest: ${calculatorResults.monthlyPI}</p>
                              <p>Interest Only: ${calculatorResults.monthlyInterestOnly}</p>
                            </div>
                          )}
                        </form>
                      ) : formSubmitted ? (
                        <div className="thank-you-message">
                          <p>{getThankYouMessage()}</p>
                        </div>
                      ) : (
                        <form onSubmit={handleFormSubmit} className="form quote-form">
                          <div className="form-columns">
                            <div className="form-column">
                              <div className="form-group">
                                <label>First Name</label>
                                <input
                                  type="text"
                                  name="firstName"
                                  value={formData.firstName}
                                  onChange={handleFormChange}
                                  required
                                />
                              </div>
                              <div className="form-group">
                                <label>Last Name</label>
                                <input
                                  type="text"
                                  name="lastName"
                                  value={formData.lastName}
                                  onChange={handleFormChange}
                                  required
                                />
                              </div>
                              <div className="form-group">
                                <label>Phone Number</label>
                                <input
                                  type="tel"
                                  name="phone"
                                  value={formData.phone}
                                  onChange={handleFormChange}
                                  required
                                />
                              </div>
                              <div className="form-group">
                                <label>Email</label>
                                <input
                                  type="email"
                                  name="email"
                                  value={formData.email}
                                  onChange={handleFormChange}
                                  required
                                />
                              </div>
                            </div>
                            <div className="form-column">
                              <div className="form-group">
                                <label>Loan Amount ($)</label>
                                <input
                                  type="number"
                                  name="loanAmount"
                                  value={formData.loanAmount}
                                  onChange={handleFormChange}
                                  step="10000"
                                  required
                                />
                              </div>
                              <div className="form-group">
                                <label>Property Type</label>
                                <select
                                  name="propertyType"
                                  value={formData.propertyType}
                                  onChange={handleFormChange}
                                  required
                                >
                                  <option value="">Select Property Type</option>
                                  <option value="Multifamily">Multifamily</option>
                                  <option value="Office">Office</option>
                                  <option value="Retail (Anchored)">Retail (Anchored)</option>
                                  <option value="Retail (Single Tenant)">Retail (Single Tenant)</option>
                                  <option value="Industrial">Industrial</option>
                                  <option value="Mixed Use">Mixed Use</option>
                                  <option value="Self Storage">Self Storage</option>
                                  <option value="Hospitality">Hospitality</option>
                                  <option value="Land">Land</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label>Loan Type</label>
                                <select
                                  name="loanType"
                                  value={formData.loanType}
                                  onChange={handleFormChange}
                                  required
                                >
                                  <option value="">Select Loan Type</option>
                                  {loanTypes.map((type, index) => (
                                    <option key={index} value={type}>{type}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="form-group">
                                <label>State</label>
                                <select
                                  name="state"
                                  value={formData.state}
                                  onChange={handleFormChange}
                                  required
                                >
                                  <option value="">Select State</option>
                                  {usStates.map((state, index) => (
                                    <option key={index} value={state}>{state}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                          <div className="form-group full-width">
                            <label>Comments</label>
                            <textarea
                              name="comments"
                              value={formData.comments}
                              onChange={handleFormChange}
                              rows="4"
                            />
                          </div>
                          <button type="submit">Get a Quote</button>
                        </form>
                      )}
                    </section>
                  </div>
                </>
              }
            />
            <Route path="/about" element={<About />} />
            <Route
              path="/products"
              element={
                <div className="content-page">
                  <h2 className="centered-header">Loan Products</h2>
                  <div className="tabs-container">
                    <div className="tabs">
                      {loanTypes.map((type, index) => (
                        <button
                          key={index}
                          className={`tab ${activeTab === type ? "active" : ""}`}
                          onClick={() => setActiveTab(type)}
                          onMouseEnter={() => window.innerWidth > 768 && setActiveTab(type)}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <div className="tab-content">
                      <h3>{loanDescriptions[activeTab].title}</h3>
                      <p>{loanDescriptions[activeTab].description}</p>
                    </div>
                  </div>
                </div>
              }
            />
            <Route path="/contact" element={<Contact />} />
            <Route
              path="/quote"
              element={
                <div className="form-wrapper">
                  <section className="form-section" id="quote">
                    <h2>{formSubmitted ? "Inquiry Sent" : "Request a Quote"}</h2>
                    {formSubmitted ? (
                      <div className="thank-you-message">
                        <p>{getThankYouMessage()}</p>
                      </div>
                    ) : (
                      <form onSubmit={handleFormSubmit} className="form quote-form">
                        <div className="form-columns">
                          <div className="form-column">
                            <div className="form-group">
                              <label>First Name</label>
                              <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleFormChange}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Last Name</label>
                              <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleFormChange}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Phone Number</label>
                              <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleFormChange}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Email</label>
                              <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleFormChange}
                                required
                              />
                            </div>
                          </div>
                          <div className="form-column">
                            <div className="form-group">
                              <label>Loan Amount ($)</label>
                              <input
                                type="number"
                                name="loanAmount"
                                value={formData.loanAmount}
                                onChange={handleFormChange}
                                step="10000"
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Property Type</label>
                              <select
                                name="propertyType"
                                value={formData.propertyType}
                                onChange={handleFormChange}
                                required
                              >
                                <option value="">Select Property Type</option>
                                <option value="Multifamily">Multifamily</option>
                                <option value="Office">Office</option>
                                <option value="Retail (Anchored)">Retail (Anchored)</option>
                                <option value="Retail (Single Tenant)">Retail (Single Tenant)</option>
                                <option value="Industrial">Industrial</option>
                                <option value="Mixed Use">Mixed Use</option>
                                <option value="Self Storage">Self Storage</option>
                                <option value="Hospitality">Hospitality</option>
                                <option value="Land">Land</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Loan Type</label>
                              <select
                                name="loanType"
                                value={formData.loanType}
                                onChange={handleFormChange}
                                required
                              >
                                <option value="">Select Loan Type</option>
                                {loanTypes.map((type, index) => (
                                  <option key={index} value={type}>{type}</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group">
                              <label>State</label>
                              <select
                                name="state"
                                value={formData.state}
                                onChange={handleFormChange}
                                required
                              >
                                <option value="">Select State</option>
                                {usStates.map((state, index) => (
                                  <option key={index} value={state}>{state}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                        <div className="form-group full-width">
                          <label>Comments</label>
                          <textarea
                            name="comments"
                            value={formData.comments}
                            onChange={handleFormChange}
                            rows="4"
                          />
                        </div>
                        <button type="submit">Get a Quote</button>
                      </form>
                    )}
                  </section>
                </div>
              }
            />
            <Route
              path="/calculator"
              element={
                <div className="form-wrapper">
                  <section className="form-section" id="calculator">
                    <h2>Loan Calculator</h2>
                    <form onSubmit={handleCalculatorSubmit} className="form calculator-form">
                      <div className="form-group">
                        <label>Loan Amount ($)</label>
                        <input
                          type="number"
                          name="loanAmount"
                          value={calculatorData.loanAmount}
                          onChange={handleCalculatorChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Interest Rate (%)</label>
                        <input
                          type="number"
                          name="interestRate"
                          value={calculatorData.interestRate}
                          onChange={handleCalculatorChange}
                          step="0.1"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Loan Term (Years)</label>
                        <input
                          type="number"
                          name="loanTerm"
                          value={calculatorData.loanTerm}
                          onChange={handleCalculatorChange}
                          required
                        />
                      </div>
                      <button type="submit">Calculate</button>
                      {calculatorResults && (
                        <div className="calculator-results">
                          <h3>Monthly Payments</h3>
                          <p>Principal & Interest: ${calculatorResults.monthlyPI}</p>
                          <p>Interest Only: ${calculatorResults.monthlyInterestOnly}</p>
                        </div>
                      )}
                    </form>
                  </section>
                </div>
              }
            />
          </Routes>
        </main>
        <footer className="footer">
          <p>&copy; 2025 SAK Lending, LLC. All rights reserved.</p>
          <p>Contact: info@saklending.com | (401) 677-7359</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;