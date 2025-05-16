import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

// Using proxy instead of direct URLs
const CLIENT_URL = `/client`;
const MODEL_URL = `/model`;

const Dashboard: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
      setAnalysisResult(null);
    }
  };

  const loadImage = (src: string) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const drawPointsOnCanvas = async () => {
    if (!canvasRef.current || !preview || !analysisResult) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const img = await loadImage(preview);


      canvas.width = img.width;
      canvas.height = img.height;
      setImageSize({ width: img.width, height: img.height });


      ctx.drawImage(img, 0, 0, img.width, img.height);

    
      if (analysisResult.masks && analysisResult.masks.length > 0) {
        analysisResult.masks.forEach((mask: number[][], index: number) => {
          if (mask.length > 0) {
    
            ctx.beginPath();

         
            ctx.moveTo(mask[0][0], mask[0][1]);

    
            for (let i = 1; i < mask.length; i++) {
              ctx.lineTo(mask[i][0], mask[i][1]);
            }
            ctx.closePath();
            ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
            ctx.fill();
          
            ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      }

      if (analysisResult.boxes) {
        analysisResult.boxes.forEach((box: number[], index: number) => {
          const x = box[0];
          const y = box[1];
          const width = box[2] - box[0];
          const height = box[3] - box[1];

          ctx.strokeStyle = "red";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, width, height);

          if (analysisResult.classes && analysisResult.confs) {
            const className = analysisResult.classes[index];
            const confidence = analysisResult.confs[index];

            ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
            ctx.fillRect(x, y - 20, 100, 20);
            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            ctx.fillText(
              `${className}: ${(confidence * 100).toFixed(1)}%`,
              x + 5,
              y - 5
            );
          }
        });
      }
    } catch (err) {
      console.error("Error drawing on canvas:", err);
    }
  };

  useEffect(() => {
    if (preview && analysisResult) {
      drawPointsOnCanvas();
    }
  }, [preview, analysisResult]);

  const uploadAndAnalyze = async () => {
    if (!selectedFile) {
      setError("Пожалуйста, выберите файл");
      return;
    }

    setIsLoading(true);
    setError(null);

       const formData = new FormData();
    formData.append("files", selectedFile);

    try {
          const uploadResponse = await axios.post(`${CLIENT_URL}/file`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      });

      if (
        !uploadResponse.data ||
        !uploadResponse.data.files ||
        uploadResponse.data.files.length === 0
      ) {
        setError("Не удалось загрузить файл");
        setIsLoading(false);
        return;
      }

      const fileIds = uploadResponse.data.files;

      const predictResponse = await axios.post(
        `${MODEL_URL}/predict`,
        {
          files_id: fileIds,
        },
        {
          withCredentials: true,
        }
      );

      if (predictResponse.data) {
    
        const fileId = fileIds[0];
        if (predictResponse.data[fileId]) {
          setAnalysisResult(predictResponse.data[fileId]);
        } else {
          setError("Не удалось получить результаты анализа");
        }
      } else {
        setError("Неожиданный формат ответа");
      }
    } catch (err: any) {
      console.error("Error uploading and analyzing:", err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || "Ошибка при анализе изображения");
      } else {
        setError("Ошибка при анализе изображения");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Анализ рентгенограмм
        </h1>

        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Загрузка изображения
          </h2>
          <div className="mb-4">
            <label
              htmlFor="file-upload"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Выберите рентгеновский снимок
            </label>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          {selectedFile && preview && (
            <div className="mt-4 mb-4">
              <p className="text-sm text-gray-600 mb-2">Предпросмотр:</p>
              <div
                className="border rounded-md p-2 overflow-hidden"
                style={{ maxWidth: "100%" }}
              >
                <img
                  src={preview}
                  alt="Preview"
                  className="max-w-full h-auto"
                />
              </div>
            </div>
          )}

          <button
            onClick={uploadAndAnalyze}
            disabled={!selectedFile || isLoading}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? "Анализ..." : "Анализировать"}
          </button>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}
        </div>

        {analysisResult && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Результаты анализа
            </h2>
            <div
              className="border rounded-md p-2 overflow-hidden"
              style={{ maxWidth: "100%" }}
            >
              <canvas
                ref={canvasRef}
                style={{ maxWidth: "100%", height: "auto" }}
              />
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                Обнаруженные элементы:
              </h3>
              {analysisResult.classes && (
                <ul className="list-disc pl-5 space-y-1">
                  {analysisResult.classes.map(
                    (className: string, index: number) => (
                      <li key={index} className="text-gray-700">
                        {className} - Уверенность:{" "}
                        {analysisResult.confs
                          ? (analysisResult.confs[index] * 100).toFixed(1) + "%"
                          : "N/A"}
                      </li>
                    )
                  )}
                </ul>
              )}

              {analysisResult.masks && analysisResult.masks.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600">
                    Обнаружено областей: {analysisResult.masks.length}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Красным выделены области интереса на рентгенограмме.
                  </p>
                </div>
              )}

              {analysisResult.message && (
                <div className="mt-3 text-sm text-gray-600">
                  <p>{analysisResult.message}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
