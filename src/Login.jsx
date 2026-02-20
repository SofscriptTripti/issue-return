import { useState } from "react";
import "./Login.css";

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (username === 'Tripti' && password === 'Tripti@123') {
      setError('');
      onLogin();
    } else {
      setError('Invalid username or password. Please try again.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="login-main">
          <div className="login-column-left">
            <h1 className="hero-title"><span className="highlight-text">INVENTORY</span> <span className="highlight-text">BASKET</span></h1>
            <p className="hero-description">
              Your Digital Pharmacy Assistant
            </p>

            <div className="login-form">
              <input
                className="login-input"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="username"
              />
              <div className="password-field-container">
                <input
                  className="login-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
              {error && <p className="login-error">{error}</p>}
              <button className="login-button" onClick={handleLogin}>SIGN IN &rarr;</button>
              {/* <p className="forgot-text">Forgot password?</p> */}
            </div>
          </div>

          <div className="login-column-right">
            <div className="image-container">
              <img
                src="https://img.freepik.com/premium-vector/online-pharmacy-concept-showing-pharmacist-give-advice-counseling-medication-customer-vector_566886-810.jpg"
                alt="Pharmacy Illustration"
                className="hero-image"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

