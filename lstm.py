import json
import numpy as np
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
from sklearn.ensemble import IsolationForest
import sys

data_file = sys.argv[1]
output_file = sys.argv[2]

with open(data_file, 'r') as f:
    data = json.load(f)

predicted_data = []

SPEED_MAX = 130
FREE_FLOW_MAX = 130
JAM_FACTOR_MIN = 0
JAM_FACTOR_MAX = 10
CONFIDENCE_MIN = 0
CONFIDENCE_MAX = 1

def clamp(value, min_value, max_value):
    return max(min_value, min(value, max_value))

for item in data:
    if item['order_time'] == 0:
        historical_data = []
        for offset in range(1, 5):
            match = next((d for d in data if d['longitude'] == item['longitude'] and d['latitude'] == item['latitude'] and d['order_time'] == -offset), None)
            if match:
                historical_data.append(match)

        if len(historical_data) == 4:
            X_train = np.array([[d['speed'], d['freeFlow'], d['jamFactor'], d['confidence']] for d in historical_data])

            scaler = MinMaxScaler()
            X_train_scaled = scaler.fit_transform(X_train)

            X_train_seq = X_train_scaled.reshape(1, 4, 4)

            inputs = tf.keras.Input(shape=(4, 4))
            lstm_out = tf.keras.layers.LSTM(50, activation='relu')(inputs)
            outputs = tf.keras.layers.Dense(4, activation='sigmoid')(lstm_out)
            model = tf.keras.Model(inputs=inputs, outputs=outputs)

            model.compile(optimizer='adam', loss='mse')
            model.fit(X_train_seq, X_train_seq, epochs=10, batch_size=1, verbose=0)

            current_seq = X_train_seq
            predictions = []

            for j in range(3):
                next_pred = model.predict(current_seq)
                predictions.append(next_pred[0])
                current_seq = np.append(current_seq[:, 1:, :], next_pred.reshape(1, 1, 4), axis=1)

            iso_forest = IsolationForest(contamination=0.1)
            prediction_array = np.array(predictions)
            iso_forest.fit(prediction_array)

            anomalies = iso_forest.predict(prediction_array)

            for k, pred in enumerate(predictions):
                speed = clamp(float(pred[0]) * SPEED_MAX, 0, SPEED_MAX)
                freeFlow = clamp(float(pred[1]) * FREE_FLOW_MAX, 0, FREE_FLOW_MAX)
                jamFactor = clamp(float(pred[2]) * JAM_FACTOR_MAX, JAM_FACTOR_MIN, JAM_FACTOR_MAX)
                confidence = clamp(float(pred[3]), CONFIDENCE_MIN, CONFIDENCE_MAX)

                predicted_data.append({
                    'order_time': k + 1,
                    'speed': speed,
                    'freeFlow': freeFlow,
                    'jamFactor': jamFactor,
                    'confidence': confidence,
                    'longitude': item['longitude'],
                    'latitude': item['latitude'],
                    'traversability': item['traversability'],
                    'lnk_id': item['lnk_id'],
                    'pnt_id': item['pnt_id'],
                    'tr_id': item['tr_id'],
                    'is_anomaly': bool(anomalies[k] == -1)
                })

with open(output_file, 'w') as f:
    json.dump(predicted_data, f)
