
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from PIL import Image
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
from torchvision import transforms


BASE_DIR = Path("/content/drive/MyDrive/crop-disease-progression")

PROGRESSION_MODEL_PATH = (
    BASE_DIR / "processed/forecast_7day_clean/"
    "clean_scaled_multimodal_forecast_model.pth"
)

SCALER_PATH = (
    BASE_DIR / "processed/forecast_7day_clean/"
    "clean_multimodal_temporal_scaler.pkl"
)

DISEASE_MODEL_PATH = (
    BASE_DIR / "disease_classification/"
    "baseline_disease_classifier.pth"
)

PROGRESSION_DATA_PATH = BASE_DIR / "processed/progression_df.csv"
IMAGE_MANIFEST_PATH = BASE_DIR / "processed/image_manifest.csv"
IMAGE_ROOT = BASE_DIR / "images"

DEVICE = torch.device("cpu")

DISEASE_CLASSES = [
    "Healthy",
    "BrownRust",
    "YellowRust",
    "Septoria",
    "Mildew"
]

TEMPORAL_FEATURES = [
    "severity_percent",
    "n_lesion",
    "n_pycn",
    "n_rust",
    "la_damaged",
    "pycn_density",
    "rust_density",
    "temp_mean_24h",
    "rh_mean_24h",
    "temp_mean_48h",
    "rh_mean_48h",
    "temp_mean_72h",
    "rh_mean_72h",
    "temp_min_72h",
    "temp_max_72h",
    "rh_min_72h",
    "rh_max_72h",
    "temp_std_72h",
    "rh_std_72h",
    "high_rh_hours_72h",
    "time_since_previous_hours",
    "prev_severity",
    "time_since_prev_hours",
    "severity_change",
    "progression_rate_robust",
    "previous_progression_rate_robust",
    "progression_acceleration_robust"
]


class CleanEnhancedMultimodalFusionGRU(nn.Module):

    def __init__(
        self,
        image_dim=1280,
        temporal_dim=27,
        image_projection=256,
        temporal_projection=64,
        hidden_size=128,
        dropout=0.2
    ):
        super().__init__()

        self.image_projection = nn.Sequential(
            nn.Linear(image_dim, image_projection),
            nn.ReLU(),
            nn.Dropout(dropout)
        )

        self.temporal_projection = nn.Sequential(
            nn.Linear(temporal_dim, temporal_projection),
            nn.ReLU(),
            nn.Dropout(dropout)
        )

        self.gru = nn.GRU(
            input_size=image_projection + temporal_projection,
            hidden_size=hidden_size,
            batch_first=True
        )

        self.regressor = nn.Sequential(
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 1)
        )

    def forward(self, x):
        image_features = x[:, :, :1280]
        temporal_features = x[:, :, 1280:]

        image_features = self.image_projection(image_features)
        temporal_features = self.temporal_projection(temporal_features)

        fused_features = torch.cat(
            [image_features, temporal_features],
            dim=2
        )

        output, _ = self.gru(fused_features)

        prediction = self.regressor(output[:, -1, :])

        return prediction.squeeze(1)


class MLInferenceService:

    def __init__(self):

        self.device = DEVICE

        self.progression_dataframe = pd.read_csv(
            PROGRESSION_DATA_PATH
        )

        self.image_manifest = pd.read_csv(
            IMAGE_MANIFEST_PATH
        )

        self.scaler = joblib.load(
            SCALER_PATH
        )

        self.feature_extractor = self._load_feature_extractor()

        self.progression_model = self._load_progression_model()

        self.disease_model = self._load_disease_model()

        self.classification_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

    def _load_feature_extractor(self):

        weights = EfficientNet_B0_Weights.DEFAULT

        model = efficientnet_b0(
            weights=weights
        )

        extractor = nn.Sequential(
            model.features,
            model.avgpool,
            nn.Flatten()
        )

        extractor = extractor.to(self.device)

        extractor.eval()

        return extractor

    def _load_progression_model(self):

        model = CleanEnhancedMultimodalFusionGRU()

        checkpoint = torch.load(
            PROGRESSION_MODEL_PATH,
            map_location=self.device,
            weights_only=False
        )

        model.load_state_dict(
            checkpoint["model_state_dict"]
        )

        model = model.to(self.device)

        model.eval()

        return model

    def _load_disease_model(self):

        weights = EfficientNet_B0_Weights.DEFAULT

        model = efficientnet_b0(
            weights=weights
        )

        model.classifier[1] = nn.Linear(
            model.classifier[1].in_features,
            len(DISEASE_CLASSES)
        )

        checkpoint = torch.load(
            DISEASE_MODEL_PATH,
            map_location=self.device,
            weights_only=False
        )

        model.load_state_dict(
            checkpoint["model_state_dict"]
        )

        model = model.to(self.device)

        model.eval()

        return model

    def _get_image_path(
        self,
        leaf_uid,
        image_filename
    ):

        return (
            IMAGE_ROOT /
            leaf_uid /
            image_filename
        )

    def _extract_embedding(
        self,
        image_path
    ):

        image = Image.open(
            image_path
        ).convert("RGB")

        image = self._resize_and_pad(
            image
        )

        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

        tensor = transform(
            image
        ).unsqueeze(0)

        tensor = tensor.to(
            self.device
        )

        with torch.no_grad():

            embedding = self.feature_extractor(
                tensor
            )

        return embedding.squeeze(0).cpu().numpy()

    def _resize_and_pad(
        self,
        image,
        width=640,
        height=128
    ):

        original_width, original_height = image.size

        scale = min(
            width / original_width,
            height / original_height
        )

        new_width = max(
            1,
            int(round(original_width * scale))
        )

        new_height = max(
            1,
            int(round(original_height * scale))
        )

        image = image.resize(
            (new_width, new_height),
            Image.Resampling.LANCZOS
        )

        canvas = Image.new(
            "RGB",
            (width, height),
            (0, 0, 0)
        )

        x_offset = (
            width - new_width
        ) // 2

        y_offset = (
            height - new_height
        ) // 2

        canvas.paste(
            image,
            (x_offset, y_offset)
        )

        return canvas

    def _classify_disease(
        self,
        image_path
    ):

        image = Image.open(
            image_path
        ).convert("RGB")

        tensor = self.classification_transform(
            image
        ).unsqueeze(0)

        tensor = tensor.to(
            self.device
        )

        with torch.no_grad():

            logits = self.disease_model(
                tensor
            )

            probabilities = torch.softmax(
                logits,
                dim=1
            )[0]

        probabilities = probabilities.cpu().numpy()

        predicted_id = int(
            np.argmax(probabilities)
        )

        result = {}

        for index, disease in enumerate(
            DISEASE_CLASSES
        ):
            result[disease] = float(
                probabilities[index] * 100
            )

        return {
            "disease": DISEASE_CLASSES[predicted_id],
            "confidence": float(
                probabilities[predicted_id] * 100
            ),
            "probabilities": result
        }



    def _normalized_image_hash(self, image):
        import hashlib

        image = image.convert("RGB")
        image = image.resize((32, 32))

        return hashlib.sha256(
            image.tobytes()
        ).hexdigest()



    def predict_from_uploaded_image(self, image):
        import torch
        from torchvision import transforms

        image = image.convert("RGB")

        disease_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

        image_tensor = disease_transform(image).unsqueeze(0).to(self.device)

        self.disease_model.eval()

        with torch.no_grad():
            logits = self.disease_model(image_tensor)
            probabilities = torch.softmax(logits, dim=1)[0]

        predicted_id = int(torch.argmax(probabilities).item())
        confidence = float(probabilities[predicted_id].item() * 100)

        disease_probabilities = {
            DISEASE_CLASSES[index]: float(probabilities[index].item() * 100)
            for index in range(len(self.disease_classes))
        }

        return {
            "disease": {
                "disease": DISEASE_CLASSES[predicted_id],
                "confidence": confidence,
                "probabilities": disease_probabilities
            },
            "progression_available": False,
            "message": "Progression forecasting requires historical observations for the same leaf."
        }

    def predict_from_sequence(
        self,
        sequence_dataframe
    ):

        sequence_dataframe = (
            sequence_dataframe
            .sort_values("timestamp")
            .reset_index(drop=True)
        )

        sequence_dataframe["timestamp"] = pd.to_datetime(
            sequence_dataframe["timestamp"]
        )

        sequence_dataframe["prev_severity"] = (
            sequence_dataframe["severity_percent"]
            .shift(1)
            .fillna(0.0)
        )

        sequence_dataframe["time_since_prev_hours"] = (
            sequence_dataframe["timestamp"]
            .diff()
            .dt.total_seconds()
            .div(3600)
            .fillna(0.0)
        )

        sequence_dataframe["severity_change"] = (
            sequence_dataframe["severity_percent"]
            - sequence_dataframe["prev_severity"]
        )

        sequence_dataframe["progression_rate_robust"] = (
            sequence_dataframe["severity_change"]
            / sequence_dataframe["time_since_prev_hours"].replace(0, np.nan)
        ).replace(
            [np.inf, -np.inf],
            np.nan
        ).fillna(0.0)

        sequence_dataframe["previous_progression_rate_robust"] = (
            sequence_dataframe["progression_rate_robust"]
            .shift(1)
            .fillna(0.0)
        )

        sequence_dataframe["progression_acceleration_robust"] = (
            sequence_dataframe["progression_rate_robust"]
            - sequence_dataframe["previous_progression_rate_robust"]
        )

        sequence_dataframe = sequence_dataframe.tail(6).reset_index(drop=True)

        embeddings = []

        for _, row in sequence_dataframe.iterrows():

            image_path = self._get_image_path(
                row["leaf_UID"],
                row["image_filename"]
            )

            embeddings.append(
                self._extract_embedding(
                    image_path
                )
            )

        embeddings = np.asarray(
            embeddings,
            dtype=np.float32
        )

        temporal = sequence_dataframe[
            TEMPORAL_FEATURES
        ].copy()

        temporal = temporal.replace(
            [np.inf, -np.inf],
            np.nan
        )

        temporal = temporal.fillna(0.0)

        temporal_values = temporal.values.astype(
            np.float32
        )

        scaled_temporal = temporal_values.copy()

        scaled_temporal[:, :21] = (
            self.scaler.transform(
                temporal_values[:, :21]
            )
        )

        combined = np.concatenate(
            [
                embeddings,
                scaled_temporal
            ],
            axis=1
        )

        tensor = torch.tensor(
            combined,
            dtype=torch.float32
        ).unsqueeze(0).to(
            self.device
        )

        with torch.no_grad():

            prediction = self.progression_model(
                tensor
            ).item()

        prediction = float(
            np.clip(
                prediction,
                0,
                100
            )
        )

        latest_row = sequence_dataframe.iloc[-1]

        current_severity = float(
            latest_row["severity_percent"]
        )

        change = prediction - current_severity

        image_path = self._get_image_path(
            latest_row["leaf_UID"],
            latest_row["image_filename"]
        )

        disease_result = self._classify_disease(
            image_path
        )

        if current_severity < 5:
            stage = "Low"
        elif current_severity < 20:
            stage = "Early"
        elif current_severity < 50:
            stage = "Moderate"
        else:
            stage = "Severe"

        if change > 0.5:
            direction = "Increasing"
        elif change < -0.5:
            direction = "Decreasing"
        else:
            direction = "Stable"

        return {
            "leaf_uid": str(
                latest_row["leaf_UID"]
            ),
            "current_severity": current_severity,
            "predicted_severity_7day": prediction,
            "severity_change": float(change),
            "progression_stage": stage,
            "direction": direction,
            "disease": disease_result
        }



def _uploaded_image_inference(self, image, image_filename=None):
    import torch
    from torchvision import transforms

    image = image.convert("RGB")

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])

    image_tensor = transform(image).unsqueeze(0).to(self.device)

    self.disease_model.eval()

    with torch.no_grad():
        logits = self.disease_model(image_tensor)
        probabilities = torch.softmax(logits, dim=1)[0]

    predicted_id = int(torch.argmax(probabilities).item())

    disease_probabilities = {}

    for index, disease_name_item in enumerate(DISEASE_CLASSES):
        disease_probabilities[disease_name_item] = float(
            probabilities[index].item() * 100
        )

    result = {
        "disease": {
            "disease": DISEASE_CLASSES[predicted_id],
            "confidence": float(probabilities[predicted_id].item() * 100),
            "probabilities": disease_probabilities
        },
        "progression_available": False,
        "message": "Progression forecasting requires a matching historical sequence."
    }

    if image_filename is None:
        return result

    matching_rows = self.image_manifest[
        self.image_manifest["image_filename"].astype(str) == str(image_filename)
    ]

    if matching_rows.empty:
        result["message"] = "This image is not present in the research dataset, so historical progression cannot be retrieved."
        return result

    matched_row = matching_rows.iloc[0]

    plot_uid = matched_row["plot_UID"]
    leaf_uid = matched_row["leaf_UID"]

    sequence = self.progression_dataframe[
        (self.progression_dataframe["plot_UID"] == plot_uid) &
        (self.progression_dataframe["leaf_UID"] == leaf_uid)
    ].copy()

    if sequence.empty:
        result["message"] = "No historical progression sequence was found for this leaf."
        return result

    sequence = sequence.merge(
        self.image_manifest[
            ["plot_UID", "leaf_UID", "timestamp", "image_filename"]
        ],
        on=["plot_UID", "leaf_UID", "timestamp"],
        how="left"
    )

    if sequence["image_filename"].isna().any():
        result["message"] = "Historical observations were found, but image information could not be matched."
        return result

    progression_result = self.predict_from_sequence(sequence)

    result["progression_available"] = True
    result["progression"] = progression_result
    result["message"] = "Historical progression sequence matched successfully."

    return result


MLInferenceService.predict_from_uploaded_image = _uploaded_image_inference

