import cv2
from cv2.typing import MatLike
from configs.config import settings

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

    return {
        "message": "Prediction completed successfully",
        "masks": masks_global,
        "boxes": boxes_global,
        "classes": classes,
        "num_classes": class_ids,
        "confs": confs,
        "detected_objects": len(class_ids),
    }