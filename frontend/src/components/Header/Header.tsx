import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import logo from "@/assets/logo.svg"; // Adjust the path to where your logo is stored
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
    <header className="bg-[#121212] shadow-sm border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-gray-800 rounded-lg">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="w-70 h-50 flex items-center justify-center shadow-md">
              <img src={logo}></img>
            </div>{" "}
          </div>

          <div className="flex items-center space-x-4">
            <nav className="flex space-x-4">
              <Link
                to="/dashboard"
                className="px-6 py-2 rounded-full font-bold text-sm text-white bg-[#3A3A3A] border border-white hover:from-[#e55a1b] hover:to-[#1c2d7c] transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md"
              >
                Анализ рентгенограмм
              </Link>
              <Link
                to="/profile"
                className="px-6 py-2 rounded-full font-bold text-sm text-white bg-[#3A3A3A] border border-white hover:from-[#e55a1b] hover:to-[#1c2d7c] transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md"
              >
                Личный кабинет
              </Link>
            </nav>

            {userEmail && (
              <div className="px-6 py-2 rounded-full font-bold text-sm text-white bg-[#3A3A3A] border border-white hover:from-[#e55a1b] hover:to-[#1c2d7c] transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md">
                {userEmail}
              </div>
            )}

            <button
              onClick={handleLogout}
              className="px-6 py-2 rounded-full font-bold text-sm text-white bg-gradient-to-r from-[#FF681F] to-[#253FAD] border border-white hover:from-[#e55a1b] hover:to-[#1c2d7c] transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md"
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
