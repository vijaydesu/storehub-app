import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home/Home";
import Chatbot from "../pages/Chatbot/Chatbot";
import Team from "../pages/Team/Team";
import GenerateThemes from "../pages/GenerateThemes/GenerateThemes";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/team" element={<Team />} />
      <Route path="/chatbot" element={<Chatbot />} />
      <Route path="/generate-themes" element={<GenerateThemes />} />
    </Routes>
  );
};

export default AppRoutes;
