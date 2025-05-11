def processed_prediction(result: list):
    masks = result[0].masks.xy
    list_masks = [masks[i].tolist() for i in range(len(masks))]
    boxes = result[0].boxes.xyxy.tolist()
    box_classes = result[0].boxes.cls.tolist()
    confs = result[0].boxes.conf.tolist()
    response_data = {
        "message": "Prediction completed successfully",
        "masks": list_masks,
        "boxes": boxes,
        "classes": box_classes,
        "confs": confs,
        "detected_objects": len(box_classes),
    }
    return response_data