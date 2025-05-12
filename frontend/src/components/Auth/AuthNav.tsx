import { Link } from "react-router-dom";
import { FC } from "react";
interface AuthNavProps {
  type: "login" | "register";
}

const AuthNav: FC<AuthNavProps> = ({ type }) => {
  return (
    <div className="text-center mt-4">
      {type === "login" ? (
        <p className="text-sm text-gray-600">
          У вас нет аккаунта?{" "}
          <Link
            to="/register"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Зарегистрируйтесь здесь
          </Link>
        </p>
      ) : (
        <p className="text-sm text-gray-600">
          Есть аккаунт?{" "}
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Войдите тут
          </Link>
        </p>
      )}
    </div>
  );
};

export default AuthNav;
