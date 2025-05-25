import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

interface Point {
  x: number;
  y: number;
}

interface MaskPoint extends Point {
  isSelected?: boolean;
}

interface MovingPointInfo {
  maskId: string;
  pointIndex: number;
  startX: number;
  startY: number;
}

interface Annotation {
  id: string;
  type: "box" | "mask";
  coordinates: number[];
  class_name: string;
}

interface SelectedHistoryItem {
  user_id: string;
  file_id: string;
  masks: number[][];
  boxes: number[][];
  classes: string[];
  num_classes: number[];
  ind_cls: { [key: string]: string };
  confs: number[];
  created_at: string;
  updated_at: string;
  path_to_report: string;
}

interface AnnotationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyItem: SelectedHistoryItem | null;
  imageSrc: string | null;
  onSave?: (updatedAnnotations: any) => void;
}

const MODEL_URL = `/model`;

const isValidUUID = (uuid: string) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

const AnnotationEditorModal: React.FC<AnnotationEditorModalProps> = ({
  isOpen,
  onClose,
  historyItem,
  imageSrc,
  onSave,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(
    null
  );
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedTool, setSelectedTool] = useState<
    "select" | "drawBox" | "drawMask" | "pan"
  >("pan");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<any>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<
    string | null
  >(null);

  const [isMovingAnnotation, setIsMovingAnnotation] = useState(false);
  const [movingAnnotationInfo, setMovingAnnotationInfo] = useState<{
    id: string;
    initialBoxCoords: number[];
    startMouseX: number;
    startMouseY: number;
  } | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  const [selectedMaskPoint, setSelectedMaskPoint] =
    useState<MovingPointInfo | null>(null);
  const [maskPoints, setMaskPoints] = useState<MaskPoint[]>([]);
  const [isPointMoving, setIsPointMoving] = useState(false);

  useEffect(() => {
    if (isOpen && imageSrc && historyItem) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImageElement(img);

        const initialAnnotations: Annotation[] = [];

        historyItem.boxes.forEach((box, index) => {
          if (box && box.length === 4) {
            const className = historyItem.classes[index];
            if (className && className !== "unknown") {
              initialAnnotations.push({
                id: `box-${index}-${Date.now()}`,
                type: "box",
                coordinates: box,
                class_name: className,
              });
            }
          }
        });

        historyItem.masks.forEach((mask, index) => {
          if (mask && mask.length > 0) {
            const className =
              historyItem.classes[index + historyItem.boxes.length];
            if (className && className !== "unknown") {
              initialAnnotations.push({
                id: `mask-${index}-${Date.now()}`,
                type: "mask",
                coordinates: mask.flat(),
                class_name: className,
              });
            }
          }
        });

        setAnnotations(initialAnnotations);
        resetEditorState();
      };
      img.onerror = () => {
        console.error("Error loading image for annotation editor");
        alert("Ошибка загрузки изображения");
      };
      img.src = imageSrc;
    } else {
      resetEditorState();
    }
  }, [isOpen, imageSrc, historyItem]);

  const resetEditorState = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setSelectedAnnotationId(null);
    setIsMovingAnnotation(false);
    setMovingAnnotationInfo(null);
    setHoveredAnnotationId(null);
    setIsDrawing(false);
    setCurrentDrawing(null);
    if (!isOpen) {
      setImageElement(null);
      setAnnotations([]);
    }
  };

  useEffect(() => {
    if (!isOpen || !canvasRef.current || !imageElement) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = imageElement.width;
    canvas.height = imageElement.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    ctx.drawImage(imageElement, 0, 0);

    annotations.forEach((ann) => {
      const isSelected = ann.id === selectedAnnotationId;
      const isHovered =
        ann.id === hoveredAnnotationId && !isSelected && !isMovingAnnotation;
      ctx.lineWidth = isSelected
        ? 3 / scale
        : isHovered
        ? 2.5 / scale
        : 2 / scale;
      let strokeColor = "red";
      let fillColor = "rgba(255, 0, 0, 0.1)";

      if (isSelected) {
        strokeColor = "blue";
        fillColor = "rgba(0, 0, 255, 0.2)";
      } else if (isHovered) {
        strokeColor = "orange";
        fillColor = "rgba(255, 165, 0, 0.15)";
      }

      if (ann.type === "box") {
        const [x1, y1, x2, y2] = ann.coordinates;
        ctx.strokeStyle = strokeColor;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        ctx.fillStyle = fillColor;
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        ctx.fillStyle = strokeColor;
        ctx.font = `${12 / scale}px Onder, sans-serif`;
        const label = `${ann.class_name}`;
        ctx.fillText(label, x1, y1 - 5 / scale);
      } else if (ann.type === "mask") {
        const points: MaskPoint[] = [];
        for (let i = 0; i < ann.coordinates.length; i += 2) {
          points.push({
            x: ann.coordinates[i],
            y: ann.coordinates[i + 1],
          });
        }

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();

        ctx.strokeStyle = isSelected ? "blue" : isHovered ? "orange" : "red";
        ctx.lineWidth = (isSelected ? 2 : 1) / scale;
        ctx.stroke();

        points.forEach((point, index) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 3 / scale, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? "blue" : isHovered ? "orange" : "red";
          ctx.fill();
          ctx.stroke();
        });

        ctx.fillStyle = isSelected ? "blue" : isHovered ? "orange" : "red";
        ctx.font = `${12 / scale}px Onder, sans-serif`;
        ctx.fillText(ann.class_name, points[0].x, points[0].y - 5 / scale);
      }
    });

    if (isDrawing && currentDrawing) {
      ctx.strokeStyle = "green";
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([4, 4]);

      if (currentDrawing.type === "box") {
        ctx.strokeRect(
          currentDrawing.x1,
          currentDrawing.y1,
          currentDrawing.x2 - currentDrawing.x1,
          currentDrawing.y2 - currentDrawing.y1
        );
      }
      ctx.setLineDash([]);
    }

    if (isDrawing && selectedTool === "drawMask" && maskPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(maskPoints[0].x, maskPoints[0].y);
      maskPoints.forEach((point, index) => {
        if (index > 0) {
          ctx.lineTo(point.x, point.y);
        }
      });

      maskPoints.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3 / scale, 0, Math.PI * 2);
        ctx.fillStyle = "green";
        ctx.fill();
        ctx.stroke();
      });
    }

    ctx.restore();
  }, [
    isOpen,
    imageElement,
    annotations,
    scale,
    offset,
    isDrawing,
    currentDrawing,
    selectedAnnotationId,
    hoveredAnnotationId,
    isMovingAnnotation,
    maskPoints,
    selectedTool,
  ]);
  
  const handleSaveAnnotations = async () => {
    if (!historyItem || isSaving) return;

    try {
      setIsSaving(true);

      if (!isValidUUID(historyItem.file_id)) {
        throw new Error("Invalid file ID format. Expected UUID.");
      }

      const updatedBoxes: number[][] = [];
      const updatedMasks: Array<Array<Array<number>>> = []; // Трехмерный массив для масок
      const updatedClasses: string[] = [];
      const updatedNumClasses: number[] = [];

      // Сначала собираем все боксы из аннотаций
      let boxCount = 0;
      annotations.forEach((ann) => {
        if (ann.type === "box") {
          const boxData = ann.coordinates.map(coord => Number(coord));
          updatedBoxes.push(boxData);
          updatedClasses.push(ann.class_name);
          updatedNumClasses.push(boxCount);
          boxCount++;
        }
      });
      
      // Затем собираем все маски, преобразуя их в правильный формат
      let maskCount = 0;
      annotations.forEach((ann) => {
        if (ann.type === "mask") {
          // Преобразуем одномерный массив координат в массив пар [x, y]
          const pairs: Array<[number, number]> = [];
          for (let i = 0; i < ann.coordinates.length; i += 2) {
            if (i + 1 < ann.coordinates.length) {
              // Убеждаемся, что координаты - числа
              const x = Number(ann.coordinates[i]);
              const y = Number(ann.coordinates[i + 1]);
                
              // Проверяем, что координаты действительные числа
              if (!isNaN(x) && !isNaN(y)) {
                pairs.push([x, y]);
              }
            }
          }
          
          // Добавляем маску только если в ней есть точки
          if (pairs.length > 2) { // Минимум 3 точки для замкнутого полигона
            updatedMasks.push(pairs);
            updatedClasses.push(ann.class_name);
            updatedNumClasses.push(boxCount + maskCount); 
            maskCount++;
          }
        }
      });      // Проверяем, что все типы данных корректны перед отправкой
      const payload = {
        file_id: historyItem.file_id,
        masks: updatedMasks,
        boxes: updatedBoxes,
        classes: updatedClasses,
        num_classes: updatedNumClasses.map(val => Number(val)), // убедимся что все элементы - числа
        ind_cls: historyItem.ind_cls || {},
        confs: historyItem.confs || [],
      };



      onSave?.(payload);
      onClose();
    } catch (error) {
      console.error("Error saving annotations:", error);
      if (error instanceof Error) {
        if (error.message.includes("UUID")) {
          alert(
            "Ошибка: Неверный формат ID файла. Пожалуйста, убедитесь, что вы редактируете существующий анализ."
          );
        } else if (error.message.includes("Unauthorized")) {
          alert("Ошибка авторизации. Пожалуйста, войдите в систему снова.");
        } else {
          alert("Ошибка при сохранении разметки: " + error.message);
        }
      } else {
        alert("Ошибка при сохранении разметки. Проверьте консоль для деталей.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getMousePosInImageSpace = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - offset.x) / scale,
      y: (e.clientY - rect.top - offset.y) / scale,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x: mouseX, y: mouseY } = getMousePosInImageSpace(e);

    if (selectedTool === "pan") {
      setIsDraggingImage(true);
      setDragStart({
        x:
          e.clientX -
          canvasRef.current!.getBoundingClientRect().left -
          offset.x,
        y:
          e.clientY - canvasRef.current!.getBoundingClientRect().top - offset.y,
      });
      setSelectedAnnotationId(null);
      setIsMovingAnnotation(false);
    } else if (selectedTool === "drawBox") {
      if (!canDrawAtPosition(mouseX, mouseY)) {
        alert("В этой области нельзя рисовать разметку");
        return;
      }
      setIsDrawing(true);
      setCurrentDrawing({
        type: "box",
        x1: mouseX,
        y1: mouseY,
        x2: mouseX,
        y2: mouseY,
      });
      setSelectedAnnotationId(null);
      setIsMovingAnnotation(false);
    } else if (selectedTool === "drawMask") {
      if (!canDrawAtPosition(mouseX, mouseY)) {
        alert("В этой области нельзя рисовать разметку");
        return;
      }
      setIsDrawing(true);
      const newPoint: MaskPoint = { x: mouseX, y: mouseY };
      setMaskPoints((prev) => [...prev, newPoint]);
    } else if (selectedTool === "select") {
      const pointInfo = findMaskPointAtPosition(mouseX, mouseY);
      if (pointInfo) {
        setIsPointMoving(true);
        setSelectedMaskPoint({
          ...pointInfo,
          startX: mouseX,
          startY: mouseY,
        });
        return;
      }

      let hitAnnotation: Annotation | null = null;
      for (let i = annotations.length - 1; i >= 0; i--) {
        const ann = annotations[i];
        if (ann.type === "box") {
          const [x1, y1, x2, y2] = ann.coordinates;
          if (mouseX >= x1 && mouseX <= x2 && mouseY >= y1 && mouseY <= y2) {
            hitAnnotation = ann;
            break;
          }
        }
      }

      if (hitAnnotation) {
        setSelectedAnnotationId(hitAnnotation.id);
        setIsDrawing(false);
        if (hitAnnotation.type === "box") {
          setIsMovingAnnotation(true);
          setMovingAnnotationInfo({
            id: hitAnnotation.id,
            initialBoxCoords: [...hitAnnotation.coordinates],
            startMouseX: mouseX,
            startMouseY: mouseY,
          });
        }
      } else {
        setSelectedAnnotationId(null);
        setIsMovingAnnotation(false);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x: currentMouseX, y: currentMouseY } = getMousePosInImageSpace(e);

    if (isPointMoving && selectedMaskPoint) {
      const { maskId, pointIndex } = selectedMaskPoint;
      setAnnotations((prevAnnotations) =>
        prevAnnotations.map((ann) => {
          if (ann.id === maskId && ann.type === "mask") {
            const newCoordinates = [...ann.coordinates];
            newCoordinates[pointIndex * 2] = currentMouseX;
            newCoordinates[pointIndex * 2 + 1] = currentMouseY;
            return { ...ann, coordinates: newCoordinates };
          }
          return ann;
        })
      );
    } else if (isDraggingImage && selectedTool === "pan") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setOffset({
        x: e.clientX - rect.left - dragStart.x,
        y: e.clientY - rect.top - dragStart.y,
      });
    } else if (isDrawing && selectedTool === "drawBox" && currentDrawing) {
      setCurrentDrawing({
        ...currentDrawing,
        x2: currentMouseX,
        y2: currentMouseY,
      });
    } else if (isDrawing && selectedTool === "drawMask") {
      const lastPoint = maskPoints[maskPoints.length - 1];
      if (lastPoint) {
        const distance = Math.sqrt(
          Math.pow(currentMouseX - lastPoint.x, 2) +
            Math.pow(currentMouseY - lastPoint.y, 2)
        );

        if (distance > 10) {
          const newPoint: MaskPoint = { x: currentMouseX, y: currentMouseY };
          setMaskPoints((prev) => [...prev, newPoint]);
        }
      }
    } else if (
      isMovingAnnotation &&
      movingAnnotationInfo &&
      selectedAnnotationId
    ) {
      const { initialBoxCoords, startMouseX, startMouseY, id } =
        movingAnnotationInfo;
      const deltaX = currentMouseX - startMouseX;
      const deltaY = currentMouseY - startMouseY;

      const newX1 = initialBoxCoords[0] + deltaX;
      const newY1 = initialBoxCoords[1] + deltaY;
      const newX2 = initialBoxCoords[2] + deltaX;
      const newY2 = initialBoxCoords[3] + deltaY;

      setAnnotations((prevAnnotations) =>
        prevAnnotations.map((ann) =>
          ann.id === id
            ? { ...ann, coordinates: [newX1, newY1, newX2, newY2] }
            : ann
        )
      );
    } else if (selectedTool === "select" && !isDrawing && !isMovingAnnotation) {
      let newHoveredId: string | null = null;
      for (let i = annotations.length - 1; i >= 0; i--) {
        const ann = annotations[i];
        if (ann.type === "box") {
          const [x1, y1, x2, y2] = ann.coordinates;
          if (
            currentMouseX >= x1 &&
            currentMouseX <= x2 &&
            currentMouseY >= y1 &&
            currentMouseY <= y2
          ) {
            newHoveredId = ann.id;
            break;
          }
        }
      }
      if (hoveredAnnotationId !== newHoveredId) {
        setHoveredAnnotationId(newHoveredId);
      }
    }
  };

  const handleMouseUp = () => {
    if (isPointMoving) {
      setIsPointMoving(false);
      setSelectedMaskPoint(null);
    } else if (isDraggingImage) {
      setIsDraggingImage(false);
    } else if (isDrawing && selectedTool === "drawBox" && currentDrawing) {
      setIsDrawing(false);
      const width = Math.abs(currentDrawing.x2 - currentDrawing.x1);
      const height = Math.abs(currentDrawing.y2 - currentDrawing.y1);

      if (width > 5 && height > 5) {
        const className = prompt("Введите название класса:", "new_object");
        if (className !== null) {
          const newBoxAnnotation: Annotation = {
            id: `box-${Date.now()}`,
            type: "box",
            coordinates: [
              Math.min(currentDrawing.x1, currentDrawing.x2),
              Math.min(currentDrawing.y1, currentDrawing.y2),
              Math.max(currentDrawing.x1, currentDrawing.x2),
              Math.max(currentDrawing.y1, currentDrawing.y2),
            ],
            class_name: className.trim() || "new_object",
          };
          setAnnotations((prev) => [...prev, newBoxAnnotation]);
          setSelectedAnnotationId(newBoxAnnotation.id);
        }
      }
      setCurrentDrawing(null);
    } else if (
      isDrawing &&
      selectedTool === "drawMask" &&
      maskPoints.length >= 3
    ) {
      setIsDrawing(false);
      const className = prompt("Введите название класса:", "new_object");
      if (className) {
        const newMaskAnnotation: Annotation = {
          id: `mask-${Date.now()}`,
          type: "mask",
          coordinates: maskPoints.flatMap((point) => [point.x, point.y]),
          class_name: className.trim() || "new_object",
        };
        setAnnotations((prev) => [...prev, newMaskAnnotation]);
        setSelectedAnnotationId(newMaskAnnotation.id);
      }
      setMaskPoints([]);
    }

    if (isMovingAnnotation) {
      setIsMovingAnnotation(false);
      setMovingAnnotationInfo(null);
    }
  };

  const handleMouseLeave = () => {
    handleMouseUp();
    setHoveredAnnotationId(null);
  };

  const getCanvasCursor = () => {
    if (selectedTool === "pan") {
      return isDraggingImage ? "grabbing" : "grab";
    }
    if (selectedTool === "drawBox" || selectedTool === "drawMask") {
      return "crosshair";
    }
    if (selectedTool === "select") {
      if (isMovingAnnotation) return "grabbing";
      if (hoveredAnnotationId) return "move";
      return "default";
    }
    return "default";
  };

  const handleToolChange = (
    tool: "select" | "drawBox" | "drawMask" | "pan"
  ) => {
    setSelectedTool(tool);
    setIsDrawing(false);
    setIsMovingAnnotation(false);

    if (tool !== "select") {
      setSelectedAnnotationId(null);
    }
    setHoveredAnnotationId(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const scaleAmount = 1.1;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const mouseXInCanvas = (mouseX - offset.x) / scale;
    const mouseYInCanvas = (mouseY - offset.y) / scale;

    const newScale = e.deltaY < 0 ? scale * scaleAmount : scale / scaleAmount;
    const clampedScale = Math.max(0.1, Math.min(newScale, 10));

    const newOffsetX = mouseX - mouseXInCanvas * clampedScale;
    const newOffsetY = mouseY - mouseYInCanvas * clampedScale;

    setScale(clampedScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  const canDrawAtPosition = (x: number, y: number): boolean => {
    if (!imageElement || !canvasRef.current) return false;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    const pixel = ctx.getImageData(x, y, 1, 1).data;

    const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
    return brightness > 20 && brightness < 235;
  };

  const isNearPoint = (
    x: number,
    y: number,
    pointX: number,
    pointY: number
  ) => {
    const distance = Math.sqrt(
      Math.pow(x - pointX, 2) + Math.pow(y - pointY, 2)
    );
    return distance < 5 / scale;
  };

  const findMaskPointAtPosition = (x: number, y: number) => {
    for (const ann of annotations) {
      if (ann.type === "mask") {
        const points: Point[] = [];
        for (let i = 0; i < ann.coordinates.length; i += 2) {
          points.push({ x: ann.coordinates[i], y: ann.coordinates[i + 1] });
        }

        for (let i = 0; i < points.length; i++) {
          if (isNearPoint(x, y, points[i].x, points[i].y)) {
            return { maskId: ann.id, pointIndex: i };
          }
        }
      }
    }
    return null;
  };
  if (!isOpen) return null;

  return (    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black bg-opacity-80 p-4" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h3 className="text-xl font-semibold text-gray-800">
            Редактор разметки
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-2 border-b bg-gray-100 flex space-x-2 items-center">          <button
            onClick={() => handleToolChange("pan")}
            className={`px-3 py-1 text-sm rounded hover:bg-gray-300 ${
              selectedTool === "pan"
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-200"
            }`}
          >
            Перемещение
          </button>
          <button
            onClick={() => handleToolChange("select")}
            className={`px-3 py-1 text-sm rounded ${
              selectedTool === "select"
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            Выделение
          </button>
          <button
            onClick={() => handleToolChange("drawBox")}
            className={`px-3 py-1 text-sm rounded ${
              selectedTool === "drawBox"
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            Рисовать рамку
          </button>
          <button
            onClick={() => handleToolChange("drawMask")}
            className={`px-3 py-1 text-sm rounded ${
              selectedTool === "drawMask"
                ? "bg-yellow-500 text-white hover:bg-yellow-600"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            Рисовать маску
          </button>

          {/* Delete button */}
          {selectedAnnotationId &&
            selectedTool === "select" &&
            !isMovingAnnotation && (              <button
                onClick={() => {
                  setAnnotations(
                    annotations.filter((ann) => ann.id !== selectedAnnotationId)
                  );
                  setSelectedAnnotationId(null);
                  setHoveredAnnotationId(null);
                }}
                className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600 ml-auto"
              >
                Удалить выделенное
              </button>
            )}          {selectedTool && (
            <span className="text-xs text-gray-600 ml-auto mr-2">
              Инструмент: {
                selectedTool === "pan" ? "Перемещение" :
                selectedTool === "select" ? "Выделение" :
                selectedTool === "drawBox" ? "Рисование рамки" :
                selectedTool === "drawMask" ? "Рисование маски" : ""
              }
            </span>
          )}
        </div>

        {/* Canvas Area */}
        <div className="flex-grow p-1 bg-gray-200 overflow-auto flex justify-center items-center">
          {imageSrc ? (
            <canvas
              ref={canvasRef}
              width={imageElement?.width || 800}
              height={imageElement?.height || 600}
              className="border border-gray-400 shadow-lg"
              style={{ cursor: getCanvasCursor() }}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
            />
          ) : (
            <div className="text-gray-500">Загрузка изображения...</div>
          )}
        </div>

        {/* Footer with Save Button */}
        <div className="flex justify-end items-center p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 rounded mr-2 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSaveAnnotations}
            disabled={isSaving}
            className={`px-4 py-2 text-sm text-white rounded transition-colors shadow-md ${
              isSaving
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {isSaving ? "Сохранение..." : "Сохранить разметку"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnotationEditorModal;
