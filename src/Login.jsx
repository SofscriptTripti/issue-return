import { useState } from "react";
import "./Login.css";

function Login({ onSelectCostCenter, stores }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // Modals
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [selectedStoreForCostCenter, setSelectedStoreForCostCenter] = useState(null);

  const costCenters = [
    "Out patient Cash",
    // "Out patient Credit",
    // "In patient Cash",
    // "OP Package patient"
  ];

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (username === "Tripti" && password === "Tripti@123") {
      setError("");
      setUsername("");
      setPassword("");
      setShowLoginModal(false);
      setShowStoreModal(true); // Open the store modal after login
    } else {
      setError("Invalid credentials");
    }
  };

  const handleStoreClick = (store) => {
    setSelectedStoreForCostCenter(store);
  };

  const handleCostCenterSelect = (store, option) => {
    setShowStoreModal(false);
    if (onSelectCostCenter) {
      onSelectCostCenter(store.name, option);
    }
  };

  return (
    <div className="landing-wrapper">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-logo">
          <img
            className="logo-icon"
            src="https://cdni.iconscout.com/illustration/premium/thumb/medicine-shopping-basket-illustration-svg-download-png-4391369.png"
            alt="Inventory Basket"
          />
          <span className="logo-text">
            <span className="logo-word-1">INVENTORY</span>
            <span className="logo-word-2">BASKET</span>
          </span>
        </div>
        <div className="navbar-links">
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Streamline Your<br />
            <span className="hero-highlight">Pharmacy Billing!</span>
          </h1>
          <div className="hero-cta-area">
            <p className="hero-subtitle">Quickly <strong>Add Medicines</strong> to the Bill with Ease!</p>
            <button className="hero-login-btn" onClick={() => setShowLoginModal(true)}>Login</button>
          </div>
        </div>

        <div className="hero-image-container">
          <div className="hero-doctor-wrapper">
            <img src="/Doctor.png" alt="Pharmacist" className="hero-doctor" />
          </div>
        </div>
      </div>

      {/* LOGIN OVERLAY MODAL */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleLoginSubmit} className="login-form">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="input-group password">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {password.length > 0 && (
                  <span className="toggle-pass" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="eye-icon"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </span>
                )}
              </div>
              {error && <p className="error-text">{error}</p>}
              <button type="submit" className="btn-submit">Login →</button>
            </form>
          </div>
        </div>
      )}

      {/* STORE SELECTION MODAL */}
      {showStoreModal && (
        <div className="modal-overlay" onClick={() => { setShowStoreModal(false); setSelectedStoreForCostCenter(null); }}>
          <div className="store-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="store-modal-header">
              <h2>{selectedStoreForCostCenter ? "Select Cost Center" : "Store Selection"}</h2>
            </div>
            <div className="store-modal-body">
              {!selectedStoreForCostCenter ? (
                stores.map((store) => (
                  <div
                    key={store.id}
                    className="store-modal-item"
                  >
                    <div className="store-item-header" onClick={() => handleStoreClick(store)}>
                      <span className="store-item-name">{store.name}</span>
                      <span style={{ marginLeft: "auto", color: "#64748b" }}>→</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="cost-center-selection-view">
                  <div style={{ marginBottom: '20px', color: '#000000', fontSize: '15px', fontWeight: '500' }}>
                    Store: <strong style={{ color: '#006ce6' }}>{selectedStoreForCostCenter.name}</strong>
                  </div>
                  <div className="store-item-body" style={{ borderTop: 'none', padding: 0, animation: 'fadeIn 0.3s ease-out' }}>
                    {costCenters.map((option, index) => (
                      <button
                        key={index}
                        className="store-cost-center-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCostCenterSelect(selectedStoreForCostCenter, option);
                        }}
                        style={{ width: '100%', textAlign: 'left', padding: '16px', fontSize: '16px' }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;