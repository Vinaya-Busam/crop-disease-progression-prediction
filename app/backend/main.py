
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from inference import MLInferenceService
from PIL import Image
import io

app = FastAPI(
    title="Crop Disease Progression Prediction API",
    description="AI-based crop disease identification and progression forecasting API",
    version="1.0.0"
)

ml_service = MLInferenceService()


class PredictionRequest(BaseModel):
    plot_UID: str
    leaf_UID: str


@app.get("/")
def root():
    return {
        "message": "Crop Disease Progression Prediction API",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "progression_model": type(ml_service.progression_model).__name__,
        "disease_model": type(ml_service.disease_model).__name__
    }


@app.post("/predict")
def predict(request: PredictionRequest):
    sequence = ml_service.progression_dataframe[
        (ml_service.progression_dataframe["plot_UID"] == request.plot_UID) &
        (ml_service.progression_dataframe["leaf_UID"] == request.leaf_UID)
    ].copy()

    if sequence.empty:
        raise HTTPException(
            status_code=404,
            detail="No progression data found for the requested plot and leaf."
        )

    sequence = sequence.merge(
        ml_service.image_manifest[
            ["plot_UID", "leaf_UID", "timestamp", "image_filename"]
        ],
        on=["plot_UID", "leaf_UID", "timestamp"],
        how="left"
    )

    if sequence["image_filename"].isna().any():
        raise HTTPException(
            status_code=500,
            detail="Image information could not be matched with progression data."
        )

    result = ml_service.predict_from_sequence(sequence)

    return result


@app.post("/predict-upload")
async def predict_upload(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid crop leaf image."
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty."
        )

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file could not be read as an image."
        )

    result = ml_service.predict_from_uploaded_image(image, file.filename)

    return result
