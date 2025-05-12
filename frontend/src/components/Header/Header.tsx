import React from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface HeaderProps {
  onAuthChange: (authenticated: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ onAuthChange }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/logout`,
          new URLSearchParams({ token }),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Accept: "application/json",
            },
            withCredentials: true,
          }
        );
      }
    } catch (error) {
      console.error("Ошибка выхода из системы:", error);
    } finally {
      localStorage.removeItem("token");
      onAuthChange(false);
      navigate("/login");
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white text-lg font-bold select-none">
                TS
              </span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">TechSquad</h1>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
