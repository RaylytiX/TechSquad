import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

// Обновлены URL для соответствия новой структуре API
const CLIENT_URL = `/client`;
const FILE_URL = `/file`;

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

interface SelectedHistoryItem {
  user_id: string;
  file_id: string;
  masks: any[];
  boxes: any[];
  classes: number[];
  confs: number[];
  created_at: string;
  updated_at: string;
}

const Profile: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] =
    useState<SelectedHistoryItem | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [debugImageLoaded, setDebugImageLoaded] = useState<boolean>(false);
  const [showMasks, setShowMasks] = useState<boolean>(true);
  const [showBoxes, setShowBoxes] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const debugImageRef = useRef<HTMLImageElement>(null);

  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      // Fetch user info
      const userResponse = await axios.get(`${CLIENT_URL}/`, {
        withCredentials: true,
      });

      if (userResponse.data) {
        setUserInfo(userResponse.data);
      }

      // Fetch user history with pagination
      await fetchHistoryPage(0);
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

  const fetchHistoryPage = async (page: number) => {
    setIsRefreshing(true);
    setError(null);

    try {
      const historyResponse = await axios.get(`${CLIENT_URL}/history`, {
        params: { page },
        withCredentials: true,
      });

      if (historyResponse.data) {
        if (Array.isArray(historyResponse.data.message)) {
          setHistory(historyResponse.data.message);
        }

        // Update pagination data
        setCurrentPage(historyResponse.data.page || 0);
        setTotalPages(historyResponse.data.total_pages || 1);

        console.log("Pagination data:", {
          currentPage: historyResponse.data.page,
          totalPages: historyResponse.data.total_pages,
        });
      }
    } catch (err: any) {
      console.error("Error fetching history page:", err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || "Ошибка при загрузке истории");
      } else {
        setError("Ошибка при загрузке истории");
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshHistory = async () => {
    await fetchHistoryPage(currentPage);
  };

  useEffect(() => {
    fetchUserData();

    // Set up interval to refresh history every 10 seconds
    const intervalId = setInterval(() => {
      refreshHistory();
    }, 10000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const fetchImagePath = async (fileId: string) => {
    setImageLoading(true);
    setImagePath(null);
    setDebugImageLoaded(false);

    try {
      console.log("Fetching image path for file ID:", fileId);
      const response = await axios.get(`${CLIENT_URL}/${FILE_URL}/${fileId}`, {
        withCredentials: true,
      });

      console.log("Image path response:", response.data);

      if (response.data && response.data.path) {
        // Extract filename from backend path
        const filename = response.data.path.split("/").pop();
        console.log("Extracted filename:", filename);

        if (filename) {
          // Прямой путь к файлу в public/media
          const imagePath = `../public/media/${filename}`;
          console.log("Setting image path to:", imagePath);
          setImagePath(imagePath);
        } else {
          console.error(
            "Could not extract filename from path:",
            response.data.path
          );
          setImagePath(null);
        }
      } else {
        console.error("No path in response data:", response.data);
        setImagePath(null);
      }
    } catch (err: any) {
      console.error("Error fetching image path:", err);
      setImagePath(null);
    } finally {
      setImageLoading(false);
    }
  };

  const drawResultsOnCanvas = () => {
    if (
      !canvasRef.current ||
      !debugImageRef.current ||
      !debugImageLoaded ||
      !selectedHistory
    ) {
      console.log("Canvas or image not ready");
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.log("Could not get canvas context");
      return;
    }

    const img = debugImageRef.current;

    // Set canvas dimensions to match the image
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw the original image on the canvas
    ctx.drawImage(img, 0, 0, img.width, img.height);

    // Draw masks if enabled and available
    if (
      showMasks &&
      selectedHistory.masks &&
      selectedHistory.masks.length > 0
    ) {
      console.log("Drawing masks, count:", selectedHistory.masks.length);
      selectedHistory.masks.forEach((mask: number[][], index: number) => {
        if (
          mask.length > 0 &&
          selectedHistory.classes &&
          index < selectedHistory.classes.length
        ) {
          // Generate a color based on the class
          const classIdx = selectedHistory.classes[index];
          const hue = (classIdx * 137) % 360; // Use prime number for better distribution
          const color = `hsl(${hue}, 70%, 50%)`;
          const rgbaFill = `hsla(${hue}, 70%, 50%, 0.3)`;
          const rgbaBorder = `hsla(${hue}, 70%, 50%, 0.8)`;

          ctx.beginPath();
          ctx.moveTo(mask[0][0], mask[0][1]);

          for (let i = 1; i < mask.length; i++) {
            ctx.lineTo(mask[i][0], mask[i][1]);
          }
          ctx.closePath();
          ctx.fillStyle = rgbaFill;
          ctx.fill();

          ctx.strokeStyle = rgbaBorder;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    }

    // Draw boxes if enabled and available
    if (
      showBoxes &&
      selectedHistory.boxes &&
      selectedHistory.boxes.length > 0
    ) {
      console.log("Drawing boxes, count:", selectedHistory.boxes.length);
      selectedHistory.boxes.forEach((box: number[], index: number) => {
        if (selectedHistory.classes && index < selectedHistory.classes.length) {
          const x = box[0];
          const y = box[1];
          const width = box[2] - box[0];
          const height = box[3] - box[1];

          // Use the same color as the corresponding mask
          const classIdx = selectedHistory.classes[index];
          const hue = (classIdx * 137) % 360;
          const color = `hsl(${hue}, 70%, 50%)`;

          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, width, height);

          if (selectedHistory.classes && selectedHistory.confs) {
            const confidence = selectedHistory.confs[index];
            // Use class names from our mapping function
            const className = getClassName(classIdx);

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(x, y - 20, 100, 20);
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            ctx.fillText(
              `${className}: ${(confidence * 100).toFixed(1)}%`,
              x + 5,
              y - 5
            );
          }
        }
      });
    }

    console.log("Canvas drawing completed");
  };

  // Redraw when toggle state changes
  useEffect(() => {
    if (debugImageLoaded && selectedHistory) {
      drawResultsOnCanvas();
    }
  }, [showMasks, showBoxes, debugImageLoaded, selectedHistory]);

  const fetchHistoryDetails = async (fileId: string) => {
    try {
      // Очищаем предыдущие данные перед загрузкой новых
      setSelectedHistory(null);
      setImagePath(null);
      setDebugImageLoaded(false);

      // Запрашиваем детали истории
      const response = await axios.get(`${CLIENT_URL}/history/${fileId}`, {
        withCredentials: true,
      });

      if (response.data) {
        setSelectedHistory(response.data);

        // Additionally fetch the image path
        await fetchImagePath(fileId);
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

  // Helper function to get class names based on class ID
  const getClassName = (classId: number): string => {
    // Mapping of class IDs to actual class names from COCO dataset
    const classMapping: { [key: number]: string } = {
      0: "person",
      1: "bicycle",
      2: "car",
      3: "motorcycle",
      4: "airplane",
      5: "bus",
      6: "train",
      7: "truck",
      8: "boat",
      9: "traffic light",
      10: "fire hydrant",
      11: "stop sign",
      12: "parking meter",
      13: "bench",
      14: "bird",
      15: "cat",
      16: "dog",
      17: "horse",
      18: "sheep",
      19: "cow",
      20: "elephant",
      21: "bear",
      22: "zebra",
      23: "giraffe",
      24: "backpack",
      25: "umbrella",
      26: "handbag",
      27: "tie",
      28: "suitcase",
      29: "frisbee",
      30: "skis",
      31: "snowboard",
      32: "sports ball",
      33: "kite",
      34: "baseball bat",
      35: "baseball glove",
      36: "skateboard",
      37: "surfboard",
      38: "tennis racket",
      39: "bottle",
      // Добавьте остальные классы по необходимости
    };

    return classMapping[classId] || `class ${classId}`;
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              История анализов
            </h2>
            <button
              onClick={refreshHistory}
              disabled={isRefreshing}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isRefreshing ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Обновление...
                </>
              ) : (
                "Обновить историю"
              )}
            </button>
          </div>

          {history.length === 0 ? (
            <p className="text-gray-600">У вас пока нет истории анализов.</p>
          ) : (
            <>
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

              {/* Pagination Controls */}
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Страница {currentPage + 1} из {Math.max(totalPages + 1, 1)}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => fetchHistoryPage(currentPage - 1)}
                    disabled={currentPage <= 0 || isRefreshing}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Назад
                  </button>
                  <button
                    onClick={() => fetchHistoryPage(currentPage + 1)}
                    disabled={currentPage >= totalPages || isRefreshing}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Вперед
                  </button>
                </div>
              </div>
            </>
          )}

          {selectedHistory && (
            <div className="mt-6 p-4 border rounded-md">
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                Детали анализа
              </h3>

              {/* Toggles for masks and boxes */}
              <div className="flex flex-wrap gap-6 mb-6 items-center bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBoxes}
                      onChange={(e) => setShowBoxes(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-700">
                      Рамки объектов
                    </span>
                  </label>
                </div>
                <div className="flex items-center">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showMasks}
                      onChange={(e) => setShowMasks(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-700">
                      Маски объектов
                    </span>
                  </label>
                </div>

                {!showBoxes && !showMasks && (
                  <div className="text-sm text-amber-600 ml-auto font-medium">
                    Включите маски или рамки для отображения найденных объектов
                  </div>
                )}
              </div>

              {imageLoading ? (
                <div className="flex justify-center py-8">
                  <svg
                    className="animate-spin h-10 w-10 text-indigo-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </div>
              ) : (
                <div className="mb-6 border rounded-md p-2 overflow-hidden">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Анализируемое изображение:
                  </p>

                  {/* Hidden original image for canvas reference */}
                  <img
                    ref={debugImageRef}
                    src={imagePath || ""}
                    alt="Оригинальное изображение"
                    className="hidden"
                    onError={(e) => {
                      console.error("Error loading image:", e);
                      // Try alternative path if image fails to load
                      const filename = imagePath?.split("/").pop();
                      if (filename) {
                        console.log("Trying alternative path for image");
                        e.currentTarget.src = `../public/media/${filename}`;
                      }
                    }}
                    onLoad={(e) => {
                      console.log("Image loaded successfully");
                      setDebugImageLoaded(true);
                      drawResultsOnCanvas();
                    }}
                  />

                  {/* Canvas for drawing the image with masks and boxes */}
                  <div className="flex justify-center">
                    <canvas
                      ref={canvasRef}
                      className="max-w-full h-auto mx-auto border border-gray-200"
                    />
                  </div>

                  {!debugImageLoaded && !imageLoading && (
                    <div className="text-center py-4 text-red-500">
                      Не удалось загрузить изображение
                    </div>
                  )}
                </div>
              )}

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
                        (classIdx: number, index: number) => {
                          const hue = (classIdx * 137) % 360;
                          const color = `hsl(${hue}, 70%, 50%)`;
                          const className = getClassName(classIdx);
                          return (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: color }}
                            >
                              {className}
                              {selectedHistory.confs &&
                                ` (${(
                                  selectedHistory.confs[index] * 100
                                ).toFixed(1)}%)`}
                            </span>
                          );
                        }
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
