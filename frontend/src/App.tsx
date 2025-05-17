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
import Profile from "./components/Profile/Profile";
import Header from "./components/Header/Header";
import axios from "axios";

declare global {
  interface ImportMeta {
    env: {
      VITE_CLIENT_API_URL: string;
      VITE_AUTH_API_URL: string;
      VITE_MODEL_API_URL: string;
    };
  }
}

const API_URL = "";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axios.get(`/client/`, {});
        setIsAuthorized(true);
      } catch (error: any) {
        if (error.response && error.response.status === 401) {
          setIsAuthorized(false);
        }
      }
    };

    checkAuth();
  }, []);

  if (isAuthorized === null) {
    return (
      <div className="flex justify-center items-center h-screen">
        Загрузка...
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axios.get(`/client/`, {});
        setIsAuthenticated(true);
      } catch (error: any) {
        if (error.response && error.response.status === 401) {
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(false);
        }
      }
    };

    checkAuth();
  }, []);

  const handleAuthChange = (authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex justify-center items-center h-screen">
        Загрузка...
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {isAuthenticated && <Header onAuthChange={handleAuthChange} />}
        <main className={isAuthenticated ? "pt-6" : ""}>
          {!isAuthenticated && (
            <div className="flex flex-col items-center mb-8 pt-8">
              <div className="w-20 h-20 mb-4 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl font-bold select-none">
                  R
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                RaylytiX
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
                element={
                  isAuthenticated ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Login onAuthChange={handleAuthChange} />
                  )
                }
              />
              <Route
                path="/register"
                element={
                  isAuthenticated ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Register onAuthChange={handleAuthChange} />
                  )
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/"
                element={
                  isAuthenticated ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
