import { useState } from "react";
import { authService } from "./api/authService";
import "./Login.css";

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // API Integration: Get Token using the username & password typed by user
      const response = await authService.getToken(username, password);
      
      console.log("Login API Response:", response);
      
      // If the API call is successful, proceed to store selection
      if (response && (response.token || response.access_token)) {
        // Save the token for future authenticated requests
        sessionStorage.setItem("authToken", response.token || response.access_token);
        sessionStorage.setItem("username", username);
        
        // Reset and hide modal so it's clean if we ever come back
        setShowLoginModal(false);
        setUsername("");
        setPassword("");
        setError("");
        
        // Notify parent of success
        if (onLoginSuccess) {
           onLoginSuccess();
        }
      } else if (response && response.success !== false) {
        // Handle cases where the response might be different but successful
        setShowLoginModal(false);
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setError("Invalid response from server. Please try again.");
      }
    } catch (err) {
      console.warn("API Error:", err);
      // Fallback messaging
      setError(err.message || "Failed to connect to the authentication server");
    } finally {
      setIsLoading(false);
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
            <img src={`${import.meta.env.BASE_URL}Doctor.png`} alt="Pharmacist" className="hero-doctor" />
          </div>
        </div>
      </div>

      {/* LOGIN OVERLAY MODAL */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal-content animated-modal glass-login-modal" onClick={(e) => e.stopPropagation()}>
            <div className="login-modal-header-modern">
               <div className="glass-brand-sphere"></div>
               <div className="glass-brand-sphere-small"></div>
            </div>
            <form onSubmit={handleLoginSubmit} className="login-form" autoComplete="off">
              {/* Fake fields to trick most browsers */}
              <input style={{display:'none'}} type="text" name="fakeusernameremembered"/>
              <input style={{display:'none'}} type="password" name="fakepasswordremembered"/>

              <div className="input-group">
                <input
                  type="text"
                  name={`user_${Math.random().toString(36).substring(7)}`}
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
              <div className="input-group password">
                <input
                  type={showPassword ? "text" : "password"}
                  name={`pass_${Math.random().toString(36).substring(7)}`}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                {password.length > 0 && (
                  <span className="toggle-pass" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      /* Eye Open Icon - Shown when password is visible, click to hide */
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="eye-icon">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    ) : (
                      /* Eye Closed (Slashed) Icon - Shown when password is hidden, click to show */
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="eye-icon">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    )}
                  </span>
                )}
              </div>
              {error && <p className="error-text">{error}</p>}
              <button type="submit" className="btn-submit" disabled={isLoading}>
                {isLoading ? "Sign In..." : "Sign In →"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;