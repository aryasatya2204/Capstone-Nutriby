"""
============================================================================================
  MPASI RECOMMENDER — FastAPI Inference Server
  File: main.py
============================================================================================
"""

from __future__ import annotations

import json
import os
import pickle
from typing import Any

import numpy as np
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Lazy-load heavy deps so import is fast ────────────────────────────────────
import tensorflow as tf
import keras 

# Kita biarkan custom_objects kosong karena Lambda sudah diatasi oleh patch di atas
custom_objects = {}

# ─────────────────────────────────────────────
# 0. PENYESUAIAN PATH LOKAL (Dinamis)
# ─────────────────────────────────────────────
# BASE_DIR akan mengarah ke: C:\Arya\Project\Capstone-Nutriby\ai\app
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# AI_DIR akan naik satu tingkat ke: C:\Arya\Project\Capstone-Nutriby\ai
AI_DIR = os.path.dirname(BASE_DIR)

# Menentukan folder models secara dinamis
MODELS_DIR = os.path.join(AI_DIR, "models")

MODEL_PATH      = os.getenv("MODEL_PATH",    os.path.join(MODELS_DIR, "mpasi_recommender.keras"))
MLBS_PATH       = os.getenv("MLBS_PATH",     os.path.join(MODELS_DIR, "mlbs.pkl"))
SCALERS_PATH    = os.getenv("SCALERS_PATH",  os.path.join(MODELS_DIR, "scalers.pkl"))
DIMS_PATH       = os.getenv("DIMS_PATH",     os.path.join(MODELS_DIR, "feature_dims.pkl"))
AMAP_PATH       = os.getenv("AMAP_PATH",     os.path.join(MODELS_DIR, "allergy_map.json"))

# Tambahkan di bawah bagian konstanta (misal di bawah AMAP_PATH)
SCORE_THRESHOLD = 0.6  # Sesuaikan dengan batas toleransi model Anda, misal 0.5 atau 0.7
# ─────────────────────────────────────────────
# 1. REGISTRASI CUSTOM LAYER (SANGAT PENTING)
# ─────────────────────────────────────────────
@keras.saving.register_keras_serializable(package="mpasi")
class PenaltyInteractionLayer(keras.layers.Layer):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    def build(self, input_shape):
        self.penalty_weight = self.add_weight(
            name="penalty_weight", shape=(1,), initializer="zeros", trainable=True
        )
        super().build(input_shape)
    def call(self, inputs):
        score, penalty_signal = inputs
        pw = tf.sigmoid(self.penalty_weight)
        penalised = score * (1.0 - pw * penalty_signal)
        return tf.clip_by_value(penalised, 0.0, 1.0)
    def get_config(self):
        return super().get_config()

custom_objects["PenaltyInteractionLayer"] = PenaltyInteractionLayer
custom_objects["tf"] = tf


# ─────────────────────────────────────────────
# 2. Pydantic Schemas
# ─────────────────────────────────────────────
class UserProfile(BaseModel):
    # Kiri: Nama di Model AI | Kanan (alias): Nama di Database Prisma
    user_id: str            = Field(alias="id")
    umur_bulan: float       = Field(alias="age_months")
    zscore_wfh: float       = Field(default=0.0, alias="zscore_wfh")
    zscore_wfa: float       = Field(default=0.0, alias="zscore_wfa")
    zscore_hfa: float       = Field(default=0.0, alias="zscore_hfa")
    budget_harian: float    = Field(alias="daily_budget")
    target_kalori_kkal: float = Field(alias="target_calories")
    target_protein_g: float   = Field(alias="target_protein")
    target_lemak_g: float     = Field(alias="target_fat")
    target_besi_mg: float     = Field(alias="target_iron")
    target_zinc_mg: float     = Field(alias="target_zinc")
    makanan_kesukaan: list[str] = Field(default_factory=list, alias="favorite_foods")
    potensi_alergi: list[str]   = Field(default_factory=list, alias="allergies")

    model_config = {"populate_by_name": True}

class RecipeCandidate(BaseModel):
    # Kiri: Nama di Model AI | Kanan (alias): Nama di Database Prisma
    recipe_id: int        = Field(alias="id")
    Usia_Min: float       = Field(alias="min_age_months")
    Usia_Max: float       = Field(alias="max_age_months")
    Est_Harga: float      = Field(alias="est_price")
    
    # Mapping nutrisi ke kolom database
    Kalori_kkal: float    = Field(alias="calories")
    Protein_g: float      = Field(alias="protein")
    Lemak_g: float        = Field(alias="fat")
    Zat_Besi_mg: float    = Field(alias="iron")
    Seng_mg: float        = Field(alias="zinc")
    
    # Mapping relasi ingredients dan allergies
    Bahan_Utama: list[str]    = Field(default_factory=list, alias="ingredients")
    Potensi_Alergi: list[str] = Field(default_factory=list, alias="allergies")

    model_config = {"populate_by_name": True}

class RecommendRequest(BaseModel):
    user: UserProfile
    recipes: list[RecipeCandidate]

class RecommendationItem(BaseModel):
    recipe_id: int
    score: float

class RecommendResponse(BaseModel):
    user_id: str
    recommendations: list[RecommendationItem]
    total_candidates: int
    total_passed_threshold: int


# ─────────────────────────────────────────────
# 3. App & lifespan state
# ─────────────────────────────────────────────
app = FastAPI(
    title="MPASI Recommender API",
    version="1.0.0",
    description="Two-Tower Neural Network Context-Aware MPASI recommendation engine",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_model   = None
_mlbs    = None
_scalers = None
_dims    = None
_amap    = None

# Menggunakan lifespan context terbaru (direkomendasikan FastAPI)
@app.on_event("startup")
def load_artefacts():
    global _model, _mlbs, _scalers, _dims, _amap
    print(f"[STARTUP] Loading model from {MODEL_PATH} …")
    
    # Gunakan custom_objects yang sudah kita buat di atas
    _model = keras.models.load_model(
        MODEL_PATH, 
        custom_objects={
            "tf": tf, 
            "PenaltyInteractionLayer": PenaltyInteractionLayer
        }, 
        safe_mode=False,
        compile=False
    )
    
    with open(MLBS_PATH,  "rb") as f: _mlbs    = pickle.load(f)
    with open(SCALERS_PATH,"rb") as f: _scalers = pickle.load(f)
    with open(DIMS_PATH,   "rb") as f: _dims    = pickle.load(f)
    with open(AMAP_PATH,   "r")  as f: _amap    = json.load(f)
    print("[STARTUP] All artefacts loaded. Server ready.")


# ─────────────────────────────────────────────
# 4. Preprocessing helpers
# ─────────────────────────────────────────────
def _standardise(items: list[str]) -> list[str]:
    result = list(items)
    for parent, children in _amap.items():
        cl = [c.lower() for c in children]
        for item in items:
            if item.lower() in cl and parent not in result:
                result.append(parent)
    return result

def _multi_hot(items: list[str], mlb) -> np.ndarray:
    arr = mlb.transform([items])   
    return arr.astype(np.float32)

def build_user_vector(user: UserProfile) -> np.ndarray:
    num_raw = np.array([[
        user.umur_bulan, user.zscore_wfh, user.zscore_wfa, user.zscore_hfa,
        user.budget_harian, user.target_kalori_kkal, user.target_protein_g,
        user.target_lemak_g, user.target_besi_mg, user.target_zinc_mg,
    ]], dtype=np.float32)
    num_scaled = _scalers["user"].transform(num_raw)
    fav_vec     = _multi_hot(user.makanan_kesukaan, _mlbs["makanan_kesukaan"])
    allergy_vec = _multi_hot(user.potensi_alergi,   _mlbs["potensi_alergi"])
    return np.hstack([num_scaled, fav_vec, allergy_vec]).astype(np.float32)

def build_recipe_vector(recipe: RecipeCandidate) -> np.ndarray:
    std_ingr    = _standardise(recipe.Bahan_Utama)
    std_allergy = _standardise(recipe.Potensi_Alergi)
    num_raw = np.array([[
        recipe.Usia_Min, recipe.Usia_Max, recipe.Est_Harga,
        recipe.Kalori_kkal, recipe.Protein_g, recipe.Lemak_g,
        recipe.Zat_Besi_mg, recipe.Seng_mg,
    ]], dtype=np.float32)
    num_scaled   = _scalers["recipe"].transform(num_raw)
    ingr_vec     = _multi_hot(std_ingr,    _mlbs["Bahan_Utama"])
    allergy_vec  = _multi_hot(std_allergy, _mlbs["Potensi_Alergi"])
    return np.hstack([num_scaled, ingr_vec, allergy_vec]).astype(np.float32)


# ─────────────────────────────────────────────
# 5. Endpoints
# ─────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _model is not None}

@app.post("/recommend", response_model=RecommendResponse)
def recommend(request: RecommendRequest):
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    user    = request.user
    recipes = request.recipes

    if not recipes:
        raise HTTPException(status_code=400, detail="No candidate recipes provided.")

    try:
        x_user_single  = build_user_vector(user)
        n              = len(recipes)
        X_user         = np.repeat(x_user_single, n, axis=0)

        X_recipe  = np.vstack([build_recipe_vector(r) for r in recipes])
        X_penalty = np.zeros((n, 1), dtype=np.float32)

        scores_raw = _model.predict(
            {"user_input": X_user,
             "recipe_input": X_recipe,
             "penalty_input": X_penalty},
            batch_size=256,
            verbose=0,
        )
        scores = scores_raw.flatten().tolist()

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference error: {exc}") from exc

    results = [
        RecommendationItem(recipe_id=r.recipe_id, score=round(s, 6))
        for r, s in zip(recipes, scores)
        if s > SCORE_THRESHOLD
    ]
    results.sort(key=lambda x: x.score, reverse=True)

    return RecommendResponse(
        user_id                 = user.user_id,
        recommendations         = results,
        total_candidates        = n,
        total_passed_threshold  = len(results),
    )


# ─────────────────────────────────────────────
# 6. Run server (Local / VS Code)
# ─────────────────────────────────────────────
if __name__ == "__main__":
    # Menggunakan 127.0.0.1 untuk local dev, dan mengaktifkan reload
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)