import "./Login.css";

function Login({ onLogin }) {
  return (
    <div className="login-container">
      <div className="login-content">
        {/* Header removed as per request */}

        <div className="login-main">
          <div className="login-column-left">
            <h1 className="hero-title">INVENTORY <span className="highlight-text">DRAFT BILL</span></h1>
            <p className="hero-description">
              Your Digital Pharmacy Assistant
            </p>

            <div className="login-form">
              <input className="login-input" type="email" placeholder="Email address" />
              <input className="login-input" type="password" placeholder="Password" />
              <button className="login-button" onClick={onLogin}>SIGN IN &rarr;</button>
              <p className="forgot-text">Forgot password?</p>
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
            {/* Background blobs for style */}
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
