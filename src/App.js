import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [rates, setRates] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    loanAmount: "",
    phone: "",
  });

  useEffect(() => {
    fetch("http://localhost:5000/api/interest-rates")
      .then((res) => res.json())
      .then((data) => setRates(data))
      .catch((err) => console.error("Error fetching rates:", err));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch("http://localhost:5000/api/borrower", {
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
        <h1>Loan Rates</h1>
      </header>
      <main className="main">
        <section className="rates-section">
          <h2>Current Interest Rates</h2>
          <div className="rates-grid">
            {rates.map((rate, index) => (
              <div key={index} className="rate-card">
                <h3>{rate.type}</h3>
                <p>{rate.rate}%</p>
              </div>
            ))}
          </div>
        </section>
        <section className="form-section">
          <h2>Borrower Information</h2>
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
            <button type="submit">Submit</button>
          </form>
        </section>
      </main>
      <footer className="footer">
        <p>&copy; 2025 Loan Rates. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;