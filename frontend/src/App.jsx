import { useState } from 'react'
import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from './Pages/Home.jsx'
import Login from "./Pages/Login.jsx";
import Signup from "./Pages/Signup.jsx";
import Ngo from "./Pages/Ngo.jsx";
import Volunteer from "./Pages/Volunteer.jsx";
import Coordinator from "./Pages/Coordinator.jsx"; 
import ProtectedRoute from './Components/ProtectedRoute.jsx';

function App() {

  return (
    <BrowserRouter>
      <Routes>
          <Route path='/' element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/ngo/*" element={<ProtectedRoute role="ngo"><Ngo /></ProtectedRoute>} />
          <Route path="/volunteer/*" element={<ProtectedRoute role="volunteer"><Volunteer /></ProtectedRoute>} />
          <Route path="/coordinator/*" element={<ProtectedRoute role="coordinator"><Coordinator /></ProtectedRoute>
        } />
      </Routes>
    
    </BrowserRouter>
  );
}

export default App
