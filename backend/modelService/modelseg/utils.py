def processed_prediction(result: list):
    boxes_ = result.boxes
    masks_ = result.masks
    if masks_ is None:
        boxes = []
        classes = []
        num_classes = []
        confs = []
        list_masks = []
    else:
        masks = masks_.xy
        list_masks = [masks[i].tolist() for i in range(len(masks))]
        boxes = boxes_.xyxy.tolist()
        classes = [result.names[item] for item in boxes_.cls.tolist()]
        num_classes = boxes_.cls.tolist()
        confs = boxes_.conf.tolist()

    response_data = {
        "message": "Prediction completed successfully",
        "masks": list_masks,
        "boxes": boxes,
        "classes": classes,
        "num_classes": num_classes,
        "confs": confs,
        "detected_objects": len(num_classes),
    }

    return response_data