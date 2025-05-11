def processed_prediction(result: list):
    boxes_ = result[0].boxes
    masks_ = result[0].masks
    if masks_ is None:
        boxes = []
        box_classes = []
        confs = []
        list_masks = []
    else:
        masks = masks_.xy
        list_masks = [masks[i].tolist() for i in range(len(masks))]
        boxes = boxes_.xyxy.tolist()
        box_classes = boxes_.cls.tolist()
        confs = boxes_.conf.tolist()

    response_data = {
        "message": "Prediction completed successfully",
        "masks": list_masks,
        "boxes": boxes,
        "classes": box_classes,
        "confs": confs,
        "detected_objects": len(box_classes),
    }

    return response_data