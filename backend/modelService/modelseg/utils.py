from datetime import datetime
import cv2
from cv2.typing import MatLike
from configs.config import settings
import uuid
from PIL import Image
import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from configs.config import settings

def merge_and_create_pdf(pred, input_dir, output_pdf):
    text=""
    for v,k in zip(pred["classes"], pred["confs"]):
        text = text+f"{v}<---->{k}\n"
    text=text+f"Название класса<---->Точность предсказания\n\nДата:{datetime.now()}\n\nРезультат обработки изображений\n"

    # Склеиваем изображения
    valid_extensions = {'.jpg', '.jpeg', '.png'}
    files = [f for f in os.listdir(input_dir) 
            if os.path.splitext(f)[1].lower() in valid_extensions]
    
    if True: files.sort()
    if not files: raise ValueError("Нет изображений для склейки")

    images = [Image.open(os.path.join(input_dir, f)) for f in files]
    total_width = sum(img.width for img in images)
    max_height = max(img.height for img in images)
    
    merged_image = Image.new('RGB', (total_width, max_height))
    x_offset = 0
    for img in images:
        merged_image.paste(img, (x_offset, 0))
        x_offset += img.width
    
    # Создаем PDF
    c = canvas.Canvas(output_pdf, pagesize=letter)
    width, height = letter
    
    # Регистрируем русский шрифт
    pdfmetrics.registerFont(TTFont('Arial', 'arial.ttf'))
    c.setFont("Arial", 12)

    # Добавляем изображение (масштабируем под ширину страницы)
    img_reader = ImageReader(merged_image)
    img_width, img_height = merged_image.size
    scale = (width - 100) / img_width  # оставляем поля по 50 точек с каждой стороны
    c.drawImage(img_reader, 50, height - 50 - img_height*scale, 
               width=img_width*scale, height=img_height*scale)

    # Добавляем текст под изображением
    text_lines = text.split('\n')
    text_height = len(text_lines) * 14
    y_position = height - 60 - img_height*scale - text_height
    #print(text_lines)
    for line in text_lines:
        c.drawString(50, y_position, line)
        y_position += 14

    c.save()

def split_img(combined_image: MatLike, name_image: str):
    """
    Нарезает исходное изображение на GRID_ROWS × GRID_COLS равных плиток
    и сохраняет их на диск. Возвращает список путей.
    """
    height, width, _ = combined_image.shape
    part_h = height // settings.GRID_ROWS
    part_w = width // settings.GRID_COLS

    paths = []
    for row in range(settings.GRID_ROWS):
        for col in range(settings.GRID_COLS):
            y0, y1 = row * part_h, (row + 1) * part_h
            x0, x1 = col * part_w, (col + 1) * part_w
            tile = combined_image[y0:y1, x0:x1]

            save_path = f'../{settings.FILE_SAVE_FOLDER}/{name_image}_r{row}_c{col}.png'
            cv2.imwrite(save_path, tile)
            paths.append(save_path)
    return paths

def processed_prediction(result: list, part_height, part_width):
    masks_global, boxes_global = [], []
    classes, class_ids, confs = [], [], []

    part_h = part_height // settings.GRID_ROWS
    part_w = part_width  // settings.GRID_COLS

    for idx, det in enumerate(result):
        row = idx // settings.GRID_COLS
        col = idx %  settings.GRID_COLS

        shift_x, shift_y = col * part_w, row * part_h

        # --- Masks ---
        if det.masks is not None:
            for mask in det.masks.xy:
                masks_global.append([
                    [ float(pt[0] + shift_x), float(pt[1] + shift_y) ]
                    for pt in mask
                ])

        # --- Boxes ---
        if det.boxes is not None:
            for box in det.boxes.xyxy:
                x1, y1, x2, y2 = box.tolist()
                boxes_global.append([
                    float(x1 + shift_x), float(y1 + shift_y),
                    float(x2 + shift_x), float(y2 + shift_y)
                ])

            classes.extend([det.names[c] for c in det.boxes.cls.tolist()])
            class_ids.extend(det.boxes.cls.tolist())
            confs.extend(det.boxes.conf.tolist())
    ind_cls = {int(i):v for i,v in zip(class_ids, classes)}
    return {
        "message": "Prediction completed successfully",
        "masks": masks_global,
        "boxes": boxes_global,
        "classes": classes,
        "num_classes": class_ids,
        "ind_cls": ind_cls,
        "confs": confs,
        "detected_objects": len(class_ids),
    }