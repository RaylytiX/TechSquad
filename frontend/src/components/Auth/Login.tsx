import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AuthNav from "./AuthNav";

const API_URL = `${import.meta.env.VITE_API_URL}/auth/login`;

interface LoginProps {
  onAuthChange: (authenticated: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onAuthChange }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      console.log("Попытка входа с почтой:", { email });
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

      console.log("Ответ сервера:", response.data);

      if (response.data.access_token) {
        localStorage.setItem("token", response.data.access_token);
        onAuthChange(true);
        navigate("/dashboard");
      } else {
        setError("Неверный ответ от сервера");
      }
    } catch (err: any) {
      console.error("Ошибка входа:", err);
      if (err.response) {
        console.error("Ответ сервера с ошибкой:", err.response.data);
        setError(err.response.data.detail || "Неверные учетные данные");
      } else if (err.request) {
        console.error("Нет ответа от сервера:", err.request);
        setError("Нет ответа от сервера");
      } else {
        console.error("Ошибка при отправке запроса:", err.message);
        setError("Ошибка при отправке запроса");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Войдите в свой аккаунт
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Почта"
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? "Вход..." : "Войти"}
            </button>
          </div>
        </form>
        <AuthNav type="login" />
      </div>
    </div>
  );
};

export default Login;
