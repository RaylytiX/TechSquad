import React, { useState, useEffect } from "react";
import axios from "axios";


const CLIENT_URL = `/client`;

interface UserInfo {
  email: string;
  is_active: boolean;
  created_at: string;
}

interface HistoryItem {
  file_id: string;
  created_at: string;
  updated_at: string;
}

const Profile: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<any | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        // Fetch user info
        const userResponse = await axios.post(
          `${CLIENT_URL}/`,
          {},
          {
            withCredentials: true,
          }
        );

        if (userResponse.data) {
          setUserInfo(userResponse.data);
        }

        // Fetch user history
        const historyResponse = await axios.post(
          `${CLIENT_URL}/history`,
          {},
          {
            withCredentials: true,
          }
        );

        if (historyResponse.data && historyResponse.data.message) {
          if (Array.isArray(historyResponse.data.message)) {
            setHistory(historyResponse.data.message);
          }
        }
      } catch (err: any) {
        console.error("Error fetching user data:", err);
        if (err.response && err.response.data) {
          setError(err.response.data.message || "Ошибка при загрузке данных");
        } else {
          setError("Ошибка при загрузке данных пользователя");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const fetchHistoryDetails = async (fileId: string) => {
    try {
      const response = await axios.post(
        `${CLIENT_URL}/history/${fileId}`,
        {},
        {
          withCredentials: true,
        }
      );

      if (response.data) {
        setSelectedHistory(response.data);
      }
    } catch (err: any) {
      console.error("Error fetching history details:", err);
      if (err.response && err.response.data) {
        setError(
          err.response.data.message || "Ошибка при загрузке деталей истории"
        );
      } else {
        setError("Ошибка при загрузке деталей истории");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Загрузка данных...</div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Личный кабинет
        </h1>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        {userInfo && (
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Информация о пользователе
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Email:</p>
                <p className="text-gray-800 font-medium">{userInfo.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Дата регистрации:</p>
                <p className="text-gray-800 font-medium">
                  {userInfo.created_at}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Статус:</p>
                <p className="text-gray-800 font-medium">
                  {userInfo.is_active ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Активен
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Неактивен
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            История анализов
          </h2>

          {history.length === 0 ? (
            <p className="text-gray-600">У вас пока нет истории анализов.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      ID файла
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Дата создания
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Дата обновления
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((item) => (
                    <tr key={item.file_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.file_id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.created_at}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.updated_at}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => fetchHistoryDetails(item.file_id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Просмотреть
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedHistory && (
            <div className="mt-6 p-4 border rounded-md">
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                Детали анализа
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">ID файла:</p>
                  <p className="text-gray-800 font-medium">
                    {selectedHistory.file_id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ID пользователя:</p>
                  <p className="text-gray-800 font-medium">
                    {selectedHistory.user_id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Дата создания:</p>
                  <p className="text-gray-800 font-medium">
                    {selectedHistory.created_at}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Дата обновления:</p>
                  <p className="text-gray-800 font-medium">
                    {selectedHistory.updated_at}
                  </p>
                </div>

                {selectedHistory.masks && (
                  <div>
                    <p className="text-sm text-gray-500">
                      Количество областей:
                    </p>
                    <p className="text-gray-800 font-medium">
                      {Array.isArray(selectedHistory.masks)
                        ? selectedHistory.masks.length
                        : "Нет данных"}
                    </p>
                  </div>
                )}

                {selectedHistory.boxes && (
                  <div>
                    <p className="text-sm text-gray-500">
                      Количество объектов:
                    </p>
                    <p className="text-gray-800 font-medium">
                      {Array.isArray(selectedHistory.boxes)
                        ? selectedHistory.boxes.length
                        : "Нет данных"}
                    </p>
                  </div>
                )}
              </div>

              {selectedHistory.classes &&
                selectedHistory.classes.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-1">
                      Обнаруженные классы:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedHistory.classes.map(
                        (className: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {className}
                            {selectedHistory.confs &&
                              ` (${(selectedHistory.confs[index] * 100).toFixed(
                                1
                              )}%)`}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
