import React, { useEffect, useState, useRef } from "react";
import "./Header.scss";
import logo from "../../assets/caseys_logo.png";
import apiService from "../../services/apiService";
import { RiInformationLine } from "react-icons/ri";

const Header = ({ onToggleInfoColumn, isInfoColumnVisible, allHealthy: parentAllHealthy, onTabChange, handleLogout, currentUser }) => {
  const [allHealthy, setAllHealthy] = useState(null);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const popupRef = useRef(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await apiService.healthCheck();
        const isHealthy = Object.values(response).every((status) => status === "Healthy");
        setAllHealthy(isHealthy);
      } catch (error) {
        setAllHealthy(false);
      }
    };
    fetchHealth();
    const intervalId = setInterval(fetchHealth, 60000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsPopupVisible(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const togglePopup = () => {
    setIsPopupVisible((prev) => !prev);
  };

  const effectiveAllHealthy = parentAllHealthy !== null ? parentAllHealthy : allHealthy;

  // Derive user initials from email or username, fallback to 'US'
  const getInitials = (name) => {
    if (!name) return 'US';
    const words = name.trim().split(/\s+/); // Split on any whitespace
    if (words.length === 1) {
      return words[0][0]?.toUpperCase() || 'US'; // Just first letter if only one word
    }
    return (words[0][0] + words[1][0]).toUpperCase();
  };
  
  const userInitials = currentUser?.name
    ? getInitials(currentUser.name)
    : currentUser?.email
      ? getInitials(currentUser.email.split('@')[0])
      : 'US';
  
  // Use username for display, fallback to 'Guest' if no user is logged in
  const displayUsername = currentUser?.name || 'Guest';

  return (
    <header className="header">
      <div className="logo-section">
        <img src={logo} alt="Casey's Logo" className="logo" />
        <h1>Information Assistant</h1>
      </div>
      <div className="header-controls">
        <div className="user-info">
          {effectiveAllHealthy !== null && (
            <div className="user-icon-container">
              <span className="user-name">
                Logged in: <strong>{displayUsername} </strong>
              </span>
              <div className="user-initials-circle" onClick={togglePopup}>
                {userInitials}
              </div>
              {isPopupVisible && (
                <div className="user-popup" ref={popupRef}>
                  <div className="popup-item" onClick={handleLogout}>
                    Logout
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <button
          className="toggle-info-button"
          onClick={onToggleInfoColumn}
          disabled={!effectiveAllHealthy}
          title={isInfoColumnVisible ? "Hide Info" : "Show Info"}
        >
          <RiInformationLine />
        </button>
      </div>
    </header>
  );
};

export default Header;