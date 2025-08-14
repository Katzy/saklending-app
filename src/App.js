import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [rates, setRates] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    loanAmount: "",
    phone: "",
    loanType: "",
  });

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/api/interest-rates`)
      .then((res) => res.json())
      .then((data) => setRates(data))
      .catch((err) => console.error("Error fetching rates:", err));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch(`${process.env.REACT_APP_API_URL}/api/borrower`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then((res) => res.json())
      .then((data) => alert(data.message))
      .catch((err) => console.error("Error submitting form:", err));
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Sak Lending</h1>
        <p>Your Trusted Partner for Commercial Loans in Massachusetts</p>
      </header>
      <main className="main">
        <section className="intro-section">
          <h2>Welcome to Sak Lending</h2>
          <p>
            Secure competitive commercial loan rates with expert guidance tailored
            for your business needs in Massachusetts.
          </p>
        </section>
        <section className="rates-section">
          <h2>Current Commercial Loan Rates</h2>
          <div className="rates-grid">
            {rates.map((rate, index) => (
              <div key={index} className="rate-card">
                <h3>{rate.type}</h3>
                <p>{rate.rate}% APR</p>
              </div>
            ))}
          </div>
        </section>
        <section className="form-section">
          <h2>Request a Quote</h2>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Loan Amount</label>
              <input
                type="number"
                name="loanAmount"
                value={formData.loanAmount}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Loan Type</label>
              <select
                name="loanType"
                value={formData.loanType}
                onChange={handleChange}
                required
              >
                <option value="">Select Loan Type</option>
                <option value="Commercial Mortgage">Commercial Mortgage</option>
                <option value="Bridge Loan">Bridge Loan</option>
                <option value="Construction Loan">Construction Loan</option>
              </select>
            </div>
            <button type="submit">Get a Quote</button>
          </form>
        </section>
      </main>
      <footer className="footer">
        <p>&copy; 2025 Sak Lending. All rights reserved.</p>
        <p>Contact: info@saklending.com | (617) 555-1234</p>
      </footer>
    </div>
  );
}

export default App;