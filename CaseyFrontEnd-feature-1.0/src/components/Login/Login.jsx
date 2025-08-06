import React, { useState, useEffect } from 'react';
import users from './users.json';
import './Login.scss';
import logo from '../../assets/caseys_logo.jpg';
import { FaUser, FaEye, FaEyeSlash, FaUnlock} from 'react-icons/fa';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPasswordScreen, setShowPasswordScreen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Check for remembered user on component mount
  useEffect(() => {
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
      const user = JSON.parse(rememberedUser);
      setUsername(user.username);
      setRememberMe(true);
      setShowPasswordScreen(true);
    }
  }, []);

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    const user = users.users.find(u => u.username === username);
    if (user) {
      setShowPasswordScreen(true);
      setError('');
      if (rememberMe) {
        localStorage.setItem('rememberedUser', JSON.stringify({ username }));
      } else {
        localStorage.removeItem('rememberedUser');
      }
    } else {
      setError('User not found');
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const user = users.users.find(u => u.username === username && u.password === password);
    if (user) {
      onLogin(user);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="logo">
          <img
            src={logo}
            alt="Casey's Logo"
            className="caseys-logo"
          />
          <div className="logo-text">
            <span className="identity-portal">Identity Portal</span>
          </div>
        </div>
        {!showPasswordScreen ? (
          <div>
            <hr className="divider" />
            <h2>Sign In</h2>
            <form onSubmit={handleUsernameSubmit}>
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              {/* <div className="checkbox">
                <input
                  type="checkbox"
                  id="keep-signed-in"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="keep-signed-in">Keep me signed in</label>
              </div> */}
              <button type="submit">Next</button>
            </form>
            {error && <p className="error">{error}</p>}
      
          </div>
        ) : (
          <div className="password-section">
            <hr className="divider" />
            <div className="outer-circle">
            <div className="user-icon">
            <span className="unlock-icon">
  <FaUnlock />
  <span>****</span>
</span>
</div>

            </div>
            <h2>Verify with your password</h2>
            <div className="username-display">
              <FaUser className="profile-icon" />
              {username}
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <label>Password</label>
              <div className="password-container">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span className="eye-icon" onClick={togglePasswordVisibility}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
              <button type="submit">Verify</button>
            </form>
            {error && <p className="error">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;