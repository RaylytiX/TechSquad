import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

// Define the structure of the annotations if it's different or more detailed for editing
// For now, we'll assume it's similar to SelectedHistoryItem for masks, boxes, classes
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
  coordinates: number[]; // [x1, y1, x2, y2] for boxes, array of [x,y] points for masks
  class_name: string;
}

interface SelectedHistoryItem {
  user_id: string;
  file_id: string;
  masks: number[][]; // Array of masks, each mask is an array of [x,y] points
  boxes: number[][]; // Array of boxes, each box is [x1,y1,x2,y2]
  classes: string[]; // Array of class names corresponding to each mask/box
  num_classes: number[]; // Array of numerical class IDs
  ind_cls: { [key: string]: string }; // Map of numerical ID to class name
  confs: number[];
  created_at: string;
  updated_at: string;
  path_to_report: string; // This is for the PDF report, not the image itself
}

interface AnnotationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyItem: SelectedHistoryItem | null;
  imageSrc: string | null; // The actual source URL of the image to annotate
  onSave?: (updatedAnnotations: any) => void; // Add callback for successful save
}

// Use relative paths for API URLs
const MODEL_URL = `/model`;

// Helper function to validate UUID
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
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // For panning image
  const [selectedTool, setSelectedTool] = useState<
    "select" | "drawBox" | "drawMask" | "pan"
  >("pan");
  const [isDrawing, setIsDrawing] = useState(false); // For drawing new shapes
  const [currentDrawing, setCurrentDrawing] = useState<any>(null); // Data for shape being drawn
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<
    string | null
  >(null);

  // States for moving existing annotations
  const [isMovingAnnotation, setIsMovingAnnotation] = useState(false);
  const [movingAnnotationInfo, setMovingAnnotationInfo] = useState<{
    id: string;
    initialBoxCoords: number[]; // For boxes [x1, y1, x2, y2]
    startMouseX: number; // Mouse X in image space at move start
    startMouseY: number; // Mouse Y in image space at move start
  } | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  const [selectedMaskPoint, setSelectedMaskPoint] =
    useState<MovingPointInfo | null>(null);
  const [maskPoints, setMaskPoints] = useState<MaskPoint[]>([]);
  const [isPointMoving, setIsPointMoving] = useState(false);

  // Load image and initial annotations
  useEffect(() => {
    if (isOpen && imageSrc && historyItem) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImageElement(img);

        // Convert historyItem data to annotations array
        const initialAnnotations: Annotation[] = [];

        // Add boxes
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

        // Add masks
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

  // Drawing logic (canvas updates)
  useEffect(() => {
    if (!isOpen || !canvasRef.current || !imageElement) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match image
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw image
    ctx.drawImage(imageElement, 0, 0);

    // Draw annotations
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
        ctx.font = `${12 / scale}px Arial`;
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

        // Draw lines between points
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();

        // Set styles based on selection state
        ctx.strokeStyle = isSelected ? "blue" : isHovered ? "orange" : "red";
        ctx.lineWidth = (isSelected ? 2 : 1) / scale;
        ctx.stroke();

        // Draw points
        points.forEach((point, index) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 3 / scale, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? "blue" : isHovered ? "orange" : "red";
          ctx.fill();
          ctx.stroke();
        });

        // Draw label
        ctx.fillStyle = isSelected ? "blue" : isHovered ? "orange" : "red";
        ctx.font = `${12 / scale}px Arial`;
        ctx.fillText(ann.class_name, points[0].x, points[0].y - 5 / scale);
      }
    });

    // Draw current drawing preview
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

    // Draw current mask preview if drawing
    if (isDrawing && selectedTool === "drawMask" && maskPoints.length > 0) {
      // Draw lines between points
      ctx.beginPath();
      ctx.moveTo(maskPoints[0].x, maskPoints[0].y);
      maskPoints.forEach((point, index) => {
        if (index > 0) {
          ctx.lineTo(point.x, point.y);
        }
      });

      // Draw points
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

      // Validate file_id is a valid UUID
      if (!isValidUUID(historyItem.file_id)) {
        throw new Error("Invalid file ID format. Expected UUID.");
      }

      // Prepare data in the format expected by the server
      const updatedBoxes: number[][] = [];
      const updatedMasks: number[][][] = [];
      const updatedClasses: string[] = [];
      const updatedNumClasses: number[] = [];

      // Sort annotations by type and extract data
      annotations.forEach((ann, index) => {
        if (ann.type === "box") {
          updatedBoxes.push(ann.coordinates);
          updatedClasses.push(ann.class_name);
          updatedNumClasses.push(index);
        } else if (ann.type === "mask") {
          // Преобразуем координаты маски в правильный формат
          const points: number[][] = [];
          for (let i = 0; i < ann.coordinates.length; i += 2) {
            points.push([ann.coordinates[i], ann.coordinates[i + 1]]);
          }
          updatedMasks.push(points);
          updatedClasses.push(ann.class_name);
          updatedNumClasses.push(index);
        }
      });

      const payload = {
        file_id: historyItem.file_id,
        masks: updatedMasks,
        boxes: updatedBoxes,
        classes: updatedClasses,
        num_classes: updatedNumClasses,
        ind_cls: historyItem.ind_cls || {},
        confs: historyItem.confs || [],
      };

      console.log("Saving annotations:", payload);

      const response = await axios.patch(
        `${MODEL_URL}/update_predict`,
        payload,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          validateStatus: function (status) {
            return status >= 200 && status < 500; // Принимаем все статусы от 200 до 499
          },
        }
      );

      if (response.status === 401) {
        throw new Error("Unauthorized: Please log in again");
      }

      if (response.data) {
        console.log("Annotations saved successfully:", response.data);
        // Передаем обновленные данные обратно в родительский компонент
        onSave?.({
          ...response.data,
          file_id: historyItem.file_id,
          user_id: historyItem.user_id,
          created_at: historyItem.created_at,
          updated_at: new Date().toISOString(),
          path_to_report: historyItem.path_to_report,
        });
        onClose();
      } else {
        throw new Error("Empty response from server");
      }
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
      // Validate if we can draw here
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
      // Validate if we can draw here
      if (!canDrawAtPosition(mouseX, mouseY)) {
        alert("В этой области нельзя рисовать разметку");
        return;
      }
      setIsDrawing(true);
      const newPoint: MaskPoint = { x: mouseX, y: mouseY };
      setMaskPoints((prev) => [...prev, newPoint]);
    } else if (selectedTool === "select") {
      // Check for mask points first
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

      // Existing box selection logic
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
      // Move the selected point
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
      // Existing pan logic
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setOffset({
        x: e.clientX - rect.left - dragStart.x,
        y: e.clientY - rect.top - dragStart.y,
      });
    } else if (isDrawing && selectedTool === "drawBox" && currentDrawing) {
      // Existing box drawing logic
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

      // Update box position
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
      // Update hover state
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
        // TODO: Hover detection for masks
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
      // Existing box completion logic
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
    handleMouseUp(); // Clean up any ongoing operations
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
    // Keep selection if switching to select tool, otherwise clear it
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

    // Calculate mouse position in canvas coordinate system before zoom
    const mouseXInCanvas = (mouseX - offset.x) / scale;
    const mouseYInCanvas = (mouseY - offset.y) / scale;

    // Calculate new scale
    const newScale = e.deltaY < 0 ? scale * scaleAmount : scale / scaleAmount;
    const clampedScale = Math.max(0.1, Math.min(newScale, 10));

    // Calculate new offset to keep mouse position fixed
    const newOffsetX = mouseX - mouseXInCanvas * clampedScale;
    const newOffsetY = mouseY - mouseYInCanvas * clampedScale;

    setScale(clampedScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  // Function to check if drawing is allowed at position
  const canDrawAtPosition = (x: number, y: number): boolean => {
    if (!imageElement || !canvasRef.current) return false;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    // Get pixel data at the point
    const pixel = ctx.getImageData(x, y, 1, 1).data;

    // Check if pixel is not completely black or white
    const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
    return brightness > 20 && brightness < 235;
  };

  // Function to check if a point is near mouse position
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

  // Function to find mask point under cursor
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
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
        <div className="p-2 border-b bg-gray-100 flex space-x-2 items-center">
          <button
            onClick={() => handleToolChange("pan")}
            className={`px-3 py-1 text-sm rounded hover:bg-gray-300 ${
              selectedTool === "pan"
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-200"
            }`}
          >
            Pan
          </button>
          <button
            onClick={() => handleToolChange("select")}
            className={`px-3 py-1 text-sm rounded ${
              selectedTool === "select"
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            Select
          </button>
          <button
            onClick={() => handleToolChange("drawBox")}
            className={`px-3 py-1 text-sm rounded ${
              selectedTool === "drawBox"
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            Draw Box
          </button>
          <button
            onClick={() => handleToolChange("drawMask")}
            className={`px-3 py-1 text-sm rounded ${
              selectedTool === "drawMask"
                ? "bg-yellow-500 text-white hover:bg-yellow-600"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            Draw Mask
          </button>

          {/* Delete button */}
          {selectedAnnotationId &&
            selectedTool === "select" &&
            !isMovingAnnotation && (
              <button
                onClick={() => {
                  setAnnotations(
                    annotations.filter((ann) => ann.id !== selectedAnnotationId)
                  );
                  setSelectedAnnotationId(null);
                  setHoveredAnnotationId(null);
                }}
                className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600 ml-auto"
              >
                Delete Selected
              </button>
            )}

          {selectedTool && (
            <span className="text-xs text-gray-600 ml-auto mr-2">
              Tool: {selectedTool}
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
