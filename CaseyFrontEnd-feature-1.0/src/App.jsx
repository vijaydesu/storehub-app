import React, { useState, useEffect, useRef } from "react";
import Header from "./components/Header/Header";
import Sidebar from "./components/Sidebar/Sidebar";
import ChatWindow from "./components/ChatWindow/ChatWindow";
import WeatherWidget from "./components/Weather/weather";
import AdminPage from "./components/Admin/Admin";
import Login from "./components/Login/Login";
import WebSocketService from "./services/websocketService";
import "./styles/common.scss";
import apiService from "./services/apiService";
import deadottericon from "./assets/otter-dead-icon.png";
import thirdColumnImage from "./assets/todays-news.png";
import { RiChat3Line, RiUserSettingsLine } from "react-icons/ri";

const App = () => {
  const [allHealthy, setAllHealthy] = useState(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isInfoColumnVisible, setIsInfoColumnVisible] = useState(false);
  const [historicalMessages, setHistoricalMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [shouldReconnectWebSocket, setShouldReconnectWebSocket] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("authToken"));
  const [currentUser, setCurrentUser] = useState(
    localStorage.getItem("currentUser") ? JSON.parse(localStorage.getItem("currentUser")) : null
  );
  const previousHealthyRef = useRef(null);
  const sidebarRef = useRef(null);
  const infoColumnRef = useRef(null);

  const WEATHER_API_KEY = process.env.REACT_APP_OPENWEATHERMAP_API_KEY;

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "authToken" || event.key === "currentUser") {
        const storedToken = localStorage.getItem("authToken");
        const storedUser = localStorage.getItem("currentUser");

        if (storedToken && storedUser) {
          const user = JSON.parse(storedUser);
          setLoggedIn(true);
          setCurrentUser(user);
          WebSocketService.connect(user, () => {
            console.log("WebSocket reconnected due to login in another tab");
          });
        } else if (event.key === "authToken" && event.newValue === null) {
          setLoggedIn(false);
          setCurrentUser(null);
          setIsSidebarVisible(false);
          setIsInfoColumnVisible(false);
          setSelectedConversation(null);
          setHistoricalMessages([]);
          setActiveTab("chat");
          setShouldReconnectWebSocket(false);
          setIsBotTyping(false);
          WebSocketService.disconnect();
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("currentUser");
    if (storedToken && storedUser) {
      setLoggedIn(true);
      setCurrentUser(JSON.parse(storedUser));
    } else {
      setLoggedIn(false);
      setCurrentUser(null);
    }
  }, []);

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
    const handleResize = () => {
      if (window.innerWidth <= 1068) {
        setIsSidebarVisible(false);
        setIsInfoColumnVisible(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (loggedIn && currentUser) {
      WebSocketService.connect(currentUser, () => {
        console.log("WebSocket connected successfully");
      });
    }
    return () => {
      WebSocketService.disconnect();
    };
  }, [loggedIn, currentUser]);

  useEffect(() => {
    if (previousHealthyRef.current !== null) {
      if (previousHealthyRef.current === false && allHealthy === true) {
        setShouldReconnectWebSocket(true);
      }
      if (allHealthy === false && (isSidebarVisible || isInfoColumnVisible)) {
        setIsSidebarVisible(false);
        setIsInfoColumnVisible(false);
      }
    }
    previousHealthyRef.current = allHealthy;
  }, [allHealthy, isSidebarVisible, isInfoColumnVisible]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (window.innerWidth <= 991) {
        if (
          isSidebarVisible &&
          sidebarRef.current &&
          !sidebarRef.current.contains(event.target) &&
          event.target.closest(".backdrop")
        ) {
          console.log("Backdrop clicked, closing sidebar");
          setIsSidebarVisible(false);
        }
        if (
          isInfoColumnVisible &&
          infoColumnRef.current &&
          !infoColumnRef.current.contains(event.target) &&
          event.target.closest(".backdrop")
        ) {
          console.log("Backdrop clicked, closing info column");
          setIsInfoColumnVisible(false);
        }
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isSidebarVisible, isInfoColumnVisible]);

  const handleToggleSidebar = () => {
    setIsSidebarVisible((prev) => !prev);
    if (isInfoColumnVisible && window.innerWidth <= 768) {
      setIsInfoColumnVisible(false);
    }
  };

  const handleToggleInfoColumn = () => {
    setIsInfoColumnVisible((prev) => !prev);
    if (isSidebarVisible && window.innerWidth <= 768) {
      setIsSidebarVisible(false);
    }
  };

  const handleBackdropClick = () => {
    setIsSidebarVisible(false);
    setIsInfoColumnVisible(false);
  };

  const handleNewConversation = () => {
    setSelectedConversation(null);
    setHistoricalMessages((prev) => prev);
  };

  const handleReceiveHistory = (messages) => {
    if (Array.isArray(messages)) {
      setHistoricalMessages(messages);
    } else {
      setHistoricalMessages([]);
    }
  };

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
    if (window.innerWidth <= 768) {
      setIsSidebarVisible(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "admin") {
      setIsSidebarVisible(false);
      setIsInfoColumnVisible(false);
    }
  };

  const handleLogin = (user) => {
    const sampleToken = `sample-token-${user.username}-${Date.now()}`;
    localStorage.setItem("authToken", sampleToken);
    localStorage.setItem("currentUser", JSON.stringify(user));
    setLoggedIn(true);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("rememberedUser");
    setLoggedIn(false);
    setCurrentUser(null);
    setIsSidebarVisible(false);
    setIsInfoColumnVisible(false);
    setSelectedConversation(null);
    setHistoricalMessages([]);
    setActiveTab("chat");
    setShouldReconnectWebSocket(false);
    setIsBotTyping(false);
    WebSocketService.disconnect();
  };

  return (
    <div className="app-container">
      {!loggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          <Header
            allHealthy={allHealthy}
            onToggleInfoColumn={handleToggleInfoColumn}
            isInfoColumnVisible={isInfoColumnVisible}
            onTabChange={handleTabChange}
            handleLogout={handleLogout}
            currentUser={currentUser}
          />
          <div className="tab-container">
            <div className="tabs">
              <button
                className={`tab-button ${activeTab === "chat" ? "active" : ""}`}
                onClick={() => handleTabChange("chat")}
              >
                <RiChat3Line className="tab-icon" />
                Chat
              </button>
              <button
                className={`tab-button ${activeTab === "admin" ? "active" : ""}`}
                onClick={() => handleTabChange("admin")}
              >
                <RiUserSettingsLine className="tab-icon" />
                Admin
              </button>
            </div>
          </div>
          <div className="container-fluid app-content-wrapper">
            <div className="row g-0 h-100">
              {activeTab === "chat" ? (
                <>
                  <div className="col-md-8 col-lg-9 chat-column">
                    <div
                      className={`app-content ${isSidebarVisible ? "sidebar-visible" : "sidebar-hidden"} ${
                        isInfoColumnVisible ? "info-visible" : "info-hidden"
                      } w-100`}
                    >
                      <div
                        className={`sidebar-wrapper ${isSidebarVisible ? "visible" : "hidden"}`}
                        ref={sidebarRef}
                      >
                        <Sidebar
                          historicalMessages={historicalMessages}
                          onConversationSelect={handleConversationSelect}
                          selectedConversation={selectedConversation}
                          isBotTyping={isBotTyping}
                          currentUser={currentUser}
                        />
                      </div>
                      {(isSidebarVisible || isInfoColumnVisible) && window.innerWidth <= 991 && (
                        <div
                          className={`backdrop ${isSidebarVisible || isInfoColumnVisible ? "visible" : ""}`}
                          onClick={handleBackdropClick}
                        ></div>
                      )}
                      <div className="main-content">
                        {allHealthy === null ? (
                          <div className="loading-message">
                            <p>Checking application status...</p>
                          </div>
                        ) : allHealthy ? (
                          <ChatWindow
                            onToggleSidebar={handleToggleSidebar}
                            onNewConversation={handleNewConversation}
                            onReceiveHistory={handleReceiveHistory}
                            selectedConversation={selectedConversation}
                            onConversationSelect={handleConversationSelect}
                            allHealthy={allHealthy}
                            shouldReconnectWebSocket={shouldReconnectWebSocket}
                            setShouldReconnectWebSocket={setShouldReconnectWebSocket}
                            isSidebarVisible={isSidebarVisible}
                            setIsBotTyping={setIsBotTyping}
                            currentUser={currentUser}
                          />
                        ) : (
                          <div className="server-down-message">
                            <img src={deadottericon} alt="Dead Otter Icon" className="dead-otter-icon" />
                            <h2>System unavailable</h2>
                            <p>
                              We apologize for the inconvenience, but the system is currently unavailable. Our team is
                              working hard to resolve the issue. Please try again later.
                              <br /> <br />
                              If you need immediate assistance, please contact our support team at
                              <br />
                              <span>
                                <a className="support-email" href="mailto:support@example.com">
                                  support@example.com
                                </a>.
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4 col-lg-3 info-column d-none d-md-block">
                    <div className="weather-container">
                      <h3 className="section-title">Local Weather</h3>
                      <WeatherWidget apiKey={WEATHER_API_KEY} defaultCity="Ankeny, Iowa" />
                    </div>
                    <hr className="section-divider" />
                    <div className="info-image">
                      <h3 className="section-title">Local News</h3>
                      <img
                        src={thirdColumnImage}
                        alt="Info Image"
                        className="response-image img-fluid"
                      />
                    </div>
                  </div>
                  <div
                    className={`info-column-wrapper ${isInfoColumnVisible ? "visible" : "hidden"} d-md-none`}
                    ref={infoColumnRef}
                  >
                    <div className="info-column">
                      <div className="weather-container">
                        <h3 className="section-title">Local Weather</h3>
                        <WeatherWidget apiKey={WEATHER_API_KEY} defaultCity="Ankeny, Iowa" />
                      </div>
                      <hr className="section-divider" />
                      <div className="info-image">
                        <h3 className="section-title">Local News</h3>
                        <img
                          src={thirdColumnImage}
                          alt="Info Image"
                          className="response-image img-fluid"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="col-12">
                  <div className="main-content">
                    {allHealthy === null ? (
                      <div className="loading-message">
                        <p>Checking application status...</p>
                      </div>
                    ) : allHealthy ? (
                      <AdminPage onSwitchToChat={() => handleTabChange("chat")} />
                    ) : (
                      <div className="server-down-message">
                        <img src={deadottericon} alt="Dead Otter Icon" className="dead-otter-icon" />
                        <h2>System unavailable</h2>
                        <p>
                          We apologize for the inconvenience, but the system is currently unavailable. Our team is
                          working hard to resolve the issue. Please try again later.
                          <br /> <br />
                          If you need immediate assistance, please contact our support team at
                          <br />
                          <span>
                            <a className="support-email" href="mailto:support@example.com">
                              support@example.com
                            </a>.
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;