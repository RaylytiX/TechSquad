import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AuthNav from "./AuthNav";
import maskot from "@/assets/maskot.png";

const API_URL = `/auth/signup`;

interface RegisterProps {
  onAuthChange: (authenticated: boolean) => void;
}

const Register: React.FC<RegisterProps> = ({ onAuthChange }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post(
        API_URL,
        {
          email,
          password,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        }
      );

      if (response.status === 201) {
        onAuthChange(true);
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Регистрация не удалась");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center bg-[#121212] py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex items-center justify-center mb-6">
          <img src={maskot}></img>
        </div>
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[#F6F6F6]">
            Создайте аккаунт
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-900/50 border border-red-700 p-4">
              <div className="text-sm text-red-300">{error}</div>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Адрес электронной почты
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-[#F6F6F6] bg-[#1e1e1e] rounded-t-md focus:outline-none focus:ring-[#FF681F] focus:border-[#FF681F] focus:z-10 sm:text-sm"
                placeholder="Адрес электронной почты"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-[#F6F6F6] bg-[#1e1e1e] focus:outline-none focus:ring-[#FF681F] focus:border-[#FF681F] focus:z-10 sm:text-sm"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Подтвердите пароль
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-[#F6F6F6] bg-[#1e1e1e] rounded-b-md focus:outline-none focus:ring-[#FF681F] focus:border-[#FF681F] focus:z-10 sm:text-sm"
                placeholder="Подтвердите пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#FF681F] hover:bg-[#e55a1b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF681F] focus:ring-offset-[#121212] disabled:opacity-50 transition-colors duration-200"
              disabled={isLoading}
            >
              {isLoading ? "Регистрация..." : "Зарегистрироваться"}
            </button>
          </div>
        </form>
        <AuthNav type="register" />
      </div>
    </div>
  );
};

export default Register;
