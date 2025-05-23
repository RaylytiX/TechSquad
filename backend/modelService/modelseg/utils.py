from datetime import datetime
import io
import re
import cv2
from cv2.typing import MatLike
from configs.config import settings
from PIL import Image
import os
# from reportlab.lib.pagesizes import letter
# from reportlab.pdfgen import canvas
# from reportlab.lib.utils import ImageReader
# from reportlab.pdfbase.ttfonts import TTFont
# from reportlab.pdfbase import pdfmetrics
from fpdf import FPDF, XPos, YPos
from configs.config import settings
from dbmodels.database import s3_dependency

# async def download_image_bytes(url: str):
#     try:
#         async with httpx.AsyncClient() as client:
#             response = await client.get(url)
#             if response.status_code != 200:
#                 return JSONResponse(
#                     status_code=response.status_code,
#                     content={"message": f"Ошибка при загрузке изображения. Код статуса: {response.status_code}"}
#                 )
#             image = Image.open(io.BytesIO(response.content)).convert("RGB")
#             return image
#     except Exception as e:
#         return JSONResponse(
#             status_code=500,
#             content={"message": f"Ошибка при скачивании изображения: {str(e)}"}
#         )

def merge_images(input_dir):
    valid_extensions = {'.jpg', '.jpeg', '.png'}
    files = [f for f in os.listdir(input_dir) 
            if os.path.splitext(f)[1].lower() in valid_extensions]
    
    if True:
        def natural_key(filename):
            return [int(text) if text.isdigit() else text for text in re.split(r'(\d+)', filename)]

        files.sort(key=natural_key)

    if not files: raise ValueError("Нет изображений для склейки")

    images = [Image.open(os.path.join(input_dir, f)) for f in files]
    total_width = sum(img.width for img in images)
    max_height = max(img.height for img in images)
    
    merged_image = Image.new('RGB', (total_width, max_height))
    x_offset = 0
    for img in images:
        merged_image.paste(img, (x_offset, 0))
        x_offset += img.width

    return merged_image

def gen_pdf(pred, merged_image: Image):
    pdf = FPDF(orientation='L', unit='mm', format='A4')

    pdf.add_font(fname="DejaVuSans.ttf")
    pdf.set_font(family="DejaVuSans", size=12)
    pdf.add_page()

    max_img_height = pdf.h - pdf.t_margin - pdf.b_margin - 20 
    img_width, img_height = merged_image.size
    aspect_ratio = img_width / img_height

    new_width = pdf.w - pdf.l_margin - pdf.r_margin
    new_height = new_width / aspect_ratio

    if new_height > max_img_height:
        new_height = max_img_height
        new_width = new_height * aspect_ratio

    pdf.image(merged_image, x=pdf.l_margin, y=pdf.t_margin, w=new_width, h=new_height)

    pdf.set_y(pdf.t_margin + new_height + 5)

    text_lines = [
        "Результат обработки изображений",
        f"Дата: {datetime.now()}",
        "Название класса<---->Точность предсказания"
    ]
    for v, k in zip(pred["classes"], pred["confs"]):
        text_lines.append(f"{v}<---->{k}")

    for line in text_lines:
        pdf.cell(0, 10, text=line, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf_buffer = io.BytesIO()
    pdf.output(pdf_buffer)
    pdf_buffer.seek(0)
    pdf_contents = pdf_buffer.getvalue()
    pdf_buffer.close()
    return pdf_contents

async def merge_and_create_pdf(pred, input_dir, name_pdf, s3: s3_dependency):
    print("Merging images")
    merged_image = merge_images(input_dir)
    print("Generate PDF")
    pdf_contents = gen_pdf(pred, merged_image)
    print(f"Sending to S3 generated PDF({name_pdf})")
    resp = await s3.put_object(
        Bucket=settings.S3_BUCKET_NAME_PDF,
        Key=name_pdf,
        Body=pdf_contents,
        ContentLength=len(pdf_contents),
        ContentType="application/pdf",
        ACL='public-read'
    )
    await s3.close()
    

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