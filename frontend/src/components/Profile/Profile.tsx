import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

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
  classes: string[];
  num_classes: number[];
  ind_cls: { [key: string]: string };
  confs: number[];
  created_at: string;
  updated_at: string;
  path_to_report: string;
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
  const [classColors, setClassColors] = useState<{ [key: string]: string }>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const debugImageRef = useRef<HTMLImageElement>(null);

  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      const userResponse = await axios.get(`${CLIENT_URL}/`, {
        withCredentials: true,
      });

      if (userResponse.data) {
        setUserInfo(userResponse.data);
      }

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

        setCurrentPage(historyResponse.data.page || 0);
        setTotalPages(historyResponse.data.total_pages || 0);

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

    const intervalId = setInterval(() => {
      refreshHistory();
    }, 10000);

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

      console.log("Image path response:", response.data.path);

      if (response.data && response.data.path) {
        const filename = response.data.path;
        console.log("Extracted filename for image:", filename);

        if (filename) {
          setImagePath(filename);
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
      console.log("Image path:", imagePath);
    } catch (err: any) {
      console.error("Error fetching image path:", err);
      setImagePath(null);
    } finally {
      setImageLoading(false);
    }
  };
  const getColorForClass = (className: string, classIndex: number) => {
    if (classColors[className]) {
      return classColors[className];
    }

    const hue = (classIndex * 137) % 360;
    const color = `hsl(${hue}, 70%, 50%)`;

    setClassColors((prevColors) => ({
      ...prevColors,
      [className]: color,
    }));

    return color;
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

    if (selectedHistory.masks && !Array.isArray(selectedHistory.masks)) {
      console.error("Masks is not an array:", selectedHistory.masks);
      selectedHistory.masks = [];
    }

    if (selectedHistory.boxes && !Array.isArray(selectedHistory.boxes)) {
      console.error("Boxes is not an array:", selectedHistory.boxes);
      selectedHistory.boxes = [];
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.log("Could not get canvas context");
      return;
    }

    const img = debugImageRef.current;

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0, img.width, img.height);
    if (
      showMasks &&
      selectedHistory.masks &&
      selectedHistory.masks.length > 0
    ) {
      selectedHistory.masks.forEach((mask: any, index: number) => {
        if (
          mask &&
          mask.length > 0 &&
          selectedHistory.classes &&
          index < selectedHistory.classes.length
        ) {
          const className = selectedHistory.classes[index];
          const classIndex = selectedHistory.num_classes[index];
          const color = getColorForClass(className, classIndex);
          const hueMatch = color.match(/\d+/);
          const hue = hueMatch ? hueMatch[0] : "0";

          const rgbaFill = `hsla(${hue}, 70%, 50%, 0.3)`;
          const rgbaBorder = `hsla(${hue}, 70%, 50%, 0.8)`;
          console.log(`Маска #${index}:`, {
            maskType: Array.isArray(mask[0])
              ? "двумерный массив"
              : "одномерный массив",
            maskLength: mask.length,
            firstElement: mask[0],
            isArrayFirstElement: Array.isArray(mask[0]),
            sample: JSON.stringify(mask).substring(0, 100),
          });

          ctx.beginPath();

          try {
            if (Array.isArray(mask[0])) {
              if (mask[0].length >= 2) {
                const x = Number(mask[0][0]);
                const y = Number(mask[0][1]);
                console.log(
                  `Маска #${index} - начальная точка (вложенный массив):`,
                  x,
                  y
                );

                ctx.moveTo(x, y);

                for (let i = 1; i < mask.length; i++) {
                  if (Array.isArray(mask[i]) && mask[i].length >= 2) {
                    ctx.lineTo(Number(mask[i][0]), Number(mask[i][1]));
                  }
                }
              }
            } else if (
              typeof mask[0] === "number" ||
              typeof mask[0] === "string"
            ) {
              const x = Number(mask[0]);
              const y = Number(mask[1]);
              console.log(
                `Маска #${index} - начальная точка (плоский массив):`,
                x,
                y
              );

              ctx.moveTo(x, y);
              for (let i = 2; i < mask.length; i += 2) {
                if (i + 1 < mask.length) {
                  ctx.lineTo(Number(mask[i]), Number(mask[i + 1]));
                }
              }
            } else {
              console.error(
                `Неподдерживаемый формат маски #${index}:`,
                typeof mask[0]
              );
            }
          } catch (error) {
            console.error(`Ошибка при отрисовке маски #${index}:`, error);
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

          const className = selectedHistory.classes[index];
          const classIndex = selectedHistory.num_classes[index];
          const color = getColorForClass(className, classIndex);

          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, width, height);

          if (selectedHistory.classes && selectedHistory.confs) {
            const confidence = selectedHistory.confs[index];

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

  useEffect(() => {
    if (debugImageLoaded && selectedHistory) {
      drawResultsOnCanvas();
    }
  }, [showMasks, showBoxes, debugImageLoaded, selectedHistory]);

  const fetchHistoryDetails = async (fileId: string) => {
    try {
      setSelectedHistory(null);
      setImagePath(null);
      setDebugImageLoaded(false);

      const response = await axios.get(`${CLIENT_URL}/history/${fileId}`, {
        withCredentials: true,
      });

      if (response.data) {
        console.log("History details response:", response.data);
        console.log("PDF report path:", response.data.path_to_report);
        setSelectedHistory(response.data);

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

  const viewPdfInBrowser = (reportPath: string) => {
    try {
      if (!reportPath) {
        setError("URL отчета не найден");
        return;
      }

      console.log("Просмотр отчета:", reportPath);
      window.open(reportPath, "_blank");
    } catch (err) {
      console.error("Ошибка при открытии отчета:", err);
      setError("Ошибка при открытии отчета");
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
    <div className="min-h-screen bg-[#121212] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-[#F6F6F6] mb-6 text-center">
          Личный кабинет
        </h1>

        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        {userInfo && (
          <div className="bg-[#1e1e1e] shadow-md rounded-lg p-6 mb-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-[#F6F6F6] mb-4">
              Информация о пользователе
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Email:</p>
                <p className="text-[#F6F6F6] font-medium">{userInfo.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Дата регистрации:</p>
                <p className="text-[#F6F6F6] font-medium">
                  {userInfo.created_at}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Статус:</p>
                <p className="text-[#F6F6F6] font-medium">
                  {userInfo.is_active ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700">
                      Активен
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-300 border border-red-700">
                      Неактивен
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#1e1e1e] shadow-md rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#F6F6F6]">
              История анализов
            </h2>
            <button
              onClick={refreshHistory}
              disabled={isRefreshing}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#FF681F] hover:bg-[#e55a1b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF681F] focus:ring-offset-[#121212] disabled:opacity-50 transition-colors duration-200"
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
            <p className="text-gray-400">У вас пока нет истории анализов.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-600">
                  <thead className="bg-[#2a2a2a]">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                      >
                        ID файла
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                      >
                        Дата создания
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                      >
                        Дата обновления
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                      >
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#1e1e1e] divide-y divide-gray-600">
                    {history.map((item) => (
                      <tr key={item.file_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#F6F6F6]">
                          {item.file_id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {item.created_at}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {item.updated_at}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          <button
                            onClick={() => fetchHistoryDetails(item.file_id)}
                            className="text-[#FF681F] hover:text-[#e55a1b] transition-colors duration-200"
                          >
                            Просмотреть
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-600">
                <div className="text-sm text-gray-400">
                  Страница {currentPage + 1} из {Math.max(totalPages + 1, 1)}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => fetchHistoryPage(currentPage - 1)}
                    disabled={currentPage <= 0 || isRefreshing}
                    className="px-3 py-1 border border-gray-600 rounded-md text-sm font-medium text-gray-300 bg-[#2a2a2a] hover:bg-[#3a3a3a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    Назад
                  </button>
                  <button
                    onClick={() => fetchHistoryPage(currentPage + 1)}
                    disabled={currentPage >= totalPages || isRefreshing}
                    className="px-3 py-1 border border-gray-600 rounded-md text-sm font-medium text-gray-300 bg-[#2a2a2a] hover:bg-[#3a3a3a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    Вперед
                  </button>
                </div>
              </div>
            </>
          )}{" "}
          {selectedHistory && (
            <div className="mt-6 p-4 border border-gray-600 rounded-md bg-[#1e1e1e]">
              <h3 className="text-lg font-medium text-[#F6F6F6] mb-2">
                Детали анализа
              </h3>
              <div className="flex flex-wrap gap-6 mb-6 items-center bg-[#2a2a2a] p-4 rounded-lg border border-gray-600">
                <div className="flex items-center">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBoxes}
                      onChange={(e) => setShowBoxes(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#FF681F]/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF681F]"></div>
                    <span className="ms-3 text-sm font-medium text-gray-300">
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
                    <div className="relative w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#FF681F]/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF681F]"></div>
                    <span className="ms-3 text-sm font-medium text-gray-300">
                      Маски объектов
                    </span>
                  </label>
                </div>

                {!showBoxes && !showMasks && (
                  <div className="text-sm text-amber-400 ml-auto font-medium">
                    Включите маски или рамки для отображения найденных объектов
                  </div>
                )}
              </div>{" "}
              {imageLoading ? (
                <div className="flex justify-center py-8">
                  <svg
                    className="animate-spin h-10 w-10 text-[#FF681F]"
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
                <div className="mb-6 border border-gray-600 rounded-md p-2 overflow-hidden bg-[#2a2a2a]">
                  <p className="text-sm font-medium text-gray-300 mb-2">
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

                      const filename = imagePath;
                      console.log("filename", filename);
                      if (filename) {
                        console.log("Trying alternative path for image");

                        const simplePath = `/media/${filename
                          .split("/")
                          .pop()}`;
                        console.log("Using simple path fallback:", simplePath);
                        e.currentTarget.src = simplePath;
                      }
                    }}
                    onLoad={(e) => {
                      console.log("Image loaded successfully");
                      setDebugImageLoaded(true);
                      drawResultsOnCanvas();
                    }}
                  />{" "}
                  {/* Canvas for drawing the image with masks and boxes */}
                  <div className="flex justify-center">
                    <canvas
                      ref={canvasRef}
                      className="max-w-full h-auto mx-auto border border-gray-600"
                    />
                  </div>{" "}
                  {!debugImageLoaded && !imageLoading && (
                    <div className="text-center py-4 text-red-400">
                      Не удалось загрузить изображение
                    </div>
                  )}
                </div>
              )}{" "}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">ID файла:</p>
                  <p className="text-[#F6F6F6] font-medium">
                    {selectedHistory.file_id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">ID пользователя:</p>
                  <p className="text-[#F6F6F6] font-medium">
                    {selectedHistory.user_id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Дата создания:</p>
                  <p className="text-[#F6F6F6] font-medium">
                    {selectedHistory.created_at}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Дата обновления:</p>
                  <p className="text-[#F6F6F6] font-medium">
                    {selectedHistory.updated_at}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Отчет</p>
                  <div className="flex space-x-2">
                    <button
                      className="text-green-400 hover:text-green-300 font-medium flex items-center transition-colors duration-200"
                      onClick={() => {
                        if (selectedHistory?.path_to_report) {
                          viewPdfInBrowser(selectedHistory.path_to_report);
                        } else {
                          setError("URL отчета не найден");
                        }
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      Открыть отчет
                    </button>
                  </div>
                </div>{" "}
                {selectedHistory.masks && (
                  <div>
                    <p className="text-sm text-gray-400">
                      Количество областей:
                    </p>
                    <p className="text-[#F6F6F6] font-medium">
                      {Array.isArray(selectedHistory.masks)
                        ? selectedHistory.masks.length
                        : "Нет данных"}
                    </p>
                  </div>
                )}
                {selectedHistory.boxes && (
                  <div>
                    <p className="text-sm text-gray-400">
                      Количество объектов:
                    </p>
                    <p className="text-[#F6F6F6] font-medium">
                      {Array.isArray(selectedHistory.boxes)
                        ? selectedHistory.boxes.length
                        : "Нет данных"}
                    </p>
                  </div>
                )}
              </div>{" "}
              {selectedHistory.classes &&
                selectedHistory.classes.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-400 mb-1">
                      Обнаруженные классы:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedHistory.classes.map(
                        (className: string, index: number) => {
                          const classIndex = selectedHistory.num_classes[index];
                          const color = getColorForClass(className, classIndex);
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
