import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import Dashboard from "./components/Dashboard/Dashboard";
import Header from "./components/Header/Header";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  const handleAuthChange = (authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {isAuthenticated && <Header onAuthChange={handleAuthChange} />}
        <main className={isAuthenticated ? "pt-6" : ""}>
          {!isAuthenticated && (
            <div className="flex flex-col items-center mb-8 pt-8">
              <div className="w-20 h-20 mb-4 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white text-4xl font-bold select-none">
                  TS
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                TechSquad
              </h1>
              <p className="text-gray-500 text-center text-sm">
                Добро пожаловать!
              </p>
            </div>
          )}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route
                path="/login"
                element={<Login onAuthChange={handleAuthChange} />}
              />
              <Route
                path="/register"
                element={<Register onAuthChange={handleAuthChange} />}
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
