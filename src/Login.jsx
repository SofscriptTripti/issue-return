import "./Login.css";

function Login({ onLogin }) {
  return (
    <div className="login-container">
      <div className="logo-container">
        <div className="pulse-circle"></div>
        <div className="plus-icon">+</div>
      </div>
      <h2 className="login-title">Inventory Draft Bill</h2>
      <div className="login-card">
        <div className="login-logo"></div>
        <p className="login-subtitle"></p>

        <input className="login-input" type="email" placeholder="Email address" />
        <input className="login-input" type="password" placeholder="Password" />

        <button className="login-button" onClick={onLogin}>Login</button>

        <p className="forgot-text">Forgot password?</p>
      </div>
    </div>
  );
}

export default Login;
