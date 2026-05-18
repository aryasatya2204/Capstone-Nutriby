import os
import tensorflow as tf
import keras

print("1. Library berhasil di-load.")

# Perbaikan: Menggunakan keras.layers.Layer (tambah .layers)
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

print("2. Mencoba membaca file model...")
model_path = r"C:\Arya\Project\Capstone-Nutriby\ai\models\mpasi_recommender.keras"

try:
    # Memastikan file ada sebelum di-load
    if not os.path.exists(model_path):
        print(f"3. GAGAL: File tidak ditemukan di {model_path}")
    else:
        model = keras.models.load_model(model_path, safe_mode=False)
        print("3. BERHASIL! File model 100% aman dan bisa dibaca.")
except Exception as e:
    print(f"3. GAGAL dengan pesan: {e}")
    
print("4. Tes selesai.")