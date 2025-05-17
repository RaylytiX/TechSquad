import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const CLIENT_URL = `/client`;
const AUTH_URL = `/auth`;

interface HeaderProps {
  onAuthChange: (authenticated: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ onAuthChange }) => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get(`${CLIENT_URL}/`, {
          withCredentials: true,
        });
        if (response.data && response.data.email) {
          setUserEmail(response.data.email);
        }
      } catch (error) {
        console.error("Failed to fetch user info", error);
      }
    };

    fetchUserInfo();
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post(
        `${AUTH_URL}/logout`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );
    } catch (error) {
      console.error("Ошибка выхода из системы:", error);
    } finally {
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

          <div className="flex items-center space-x-4">
            <nav className="flex space-x-4">
              <Link
                to="/dashboard"
                className="text-gray-700 hover:text-indigo-600 font-medium px-3 py-2 rounded-md text-sm"
              >
                Анализ рентгенограмм
              </Link>
              <Link
                to="/profile"
                className="text-gray-700 hover:text-indigo-600 font-medium px-3 py-2 rounded-md text-sm"
              >
                Личный кабинет
              </Link>
            </nav>

            {userEmail && (
              <div className="text-sm text-gray-600 hidden md:inline-block mr-2">
                {userEmail}
              </div>
            )}

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
