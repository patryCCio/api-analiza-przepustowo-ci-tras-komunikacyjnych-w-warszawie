import json
import numpy as np
import tensorflow as tf
from sklearn.ensemble import IsolationForest
from multiprocessing import Pool, cpu_count
import os
import sys
import io

def clamp(value, min_value, max_value):
    return max(min_value, min(value, max_value))

def build_model(input_shape):
    inputs = tf.keras.Input(shape=input_shape)
    lstm_out = tf.keras.layers.LSTM(50, activation='tanh', return_sequences=True)(inputs)
    outputs = tf.keras.layers.TimeDistributed(tf.keras.layers.Dense(3))(lstm_out)
    model = tf.keras.Model(inputs=inputs, outputs=outputs)
    model.compile(optimizer=tf.keras.optimizers.Adam(), loss='mse')
    return model

def process_group(args):
    records_group, model, scaling_params = args
    min_speed, max_speed, min_freeFlow, max_freeFlow, min_jamFactor, max_jamFactor = scaling_params

    # Normalizacja danych przed trenowaniem
    X_train = np.array([
        [
            (record['speed'] - min_speed) / (max_speed - min_speed),
            (record['freeFlow'] - min_freeFlow) / (max_freeFlow - min_freeFlow),
            (record['jamFactor'] - min_jamFactor) / (max_jamFactor - min_jamFactor)  # Normalizacja JamFactor
        ]
        for record in records_group
    ]).reshape(1, 3, 3)

    # Trenowanie modelu
    model.fit(X_train, X_train, epochs=20, batch_size=1, verbose=0)

    predictions = []
    next_pred = model.predict(X_train, verbose=0)
    
    predictions.append(next_pred[0, -1])
    print("First prediction (before scaling):", next_pred[0, -1])

    current_seq = np.append(X_train[:, 1:, :], next_pred[:, -1:, :], axis=1)
    next_pred = model.predict(current_seq, verbose=0)
    predictions.append(next_pred[0, -1])
    print("Second prediction (before scaling):", next_pred[0, -1])

    result = []
    prediction_array = np.array(predictions).reshape(-1, 3)

    iso_forest = IsolationForest(contamination=0.05)
    iso_forest.fit(prediction_array)
    anomalies = iso_forest.predict(prediction_array)

    for i, pred in enumerate(predictions):
        speed = clamp(float(pred[0]) * (max_speed - min_speed) + min_speed, 2, 25)
        freeFlow = clamp(float(pred[1]) * (max_freeFlow - min_freeFlow) + min_freeFlow, 2, 25)
        
        # Poprawiona normalizacja JamFactor
        jamFactor = clamp(float(pred[2]) * (max_jamFactor - min_jamFactor) + min_jamFactor, 2, 10)

        # Redukcja prędkości 
        if jamFactor > 8 and speed > 12:
            speed *= (10 - jamFactor) / 10

        print(f"Predicted values after scaling - Speed: {speed}, FreeFlow: {freeFlow}, JamFactor: {jamFactor}")

        confidence = clamp(float(records_group[2]['confidence']), 0, 1)

        is_anomaly = int(anomalies[i] == -1)
        print(f"Anomaly detected: {is_anomaly == 1}")

        result.append({
            'name': records_group[2]['name'],
            'speed': speed,
            'speedUncapped': records_group[2]['speedUncapped'],
            'freeFlow': freeFlow,
            'jamFactor': jamFactor,
            'confidence': confidence,
            'traversability': records_group[2]['traversability'],
            'order_time': i + 1,
            'points': records_group[2]['points'],
            'is_anomaly': is_anomaly
        })

    return result

def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

    print("Num GPUs Available: ", len(tf.config.list_physical_devices('GPU')))

    t0 = sys.argv[1]
    t1 = sys.argv[2]
    t2 = sys.argv[3]
    output_file = sys.argv[4]

    with open(t0, 'r', encoding='utf-8') as f:
        dataT0 = json.load(f)

    with open(t1, 'r', encoding='utf-8') as f:  
        dataT1 = json.load(f)

    with open(t2, 'r', encoding='utf-8') as f:
        dataT2 = json.load(f)

    predicted_data = []

    records_groups = []
    for i in range(len(dataT0)):
        records_groups.append([dataT2[i], dataT1[i], dataT0[i]])

    min_speed = 2
    max_speed = 25
    min_freeFlow = 2
    max_freeFlow = 25
    min_jamFactor = 2
    max_jamFactor = 10

    scaling_params = (min_speed, max_speed, min_freeFlow, max_freeFlow, min_jamFactor, max_jamFactor)

    model = build_model((3, 3))

    with Pool(cpu_count()) as pool:
        results = pool.map(process_group, [(group, model, scaling_params) for group in records_groups])

    for result in results:
        if result:
            predicted_data.extend(result)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(predicted_data, f, ensure_ascii=False)

    print("Prediction results saved to", output_file)

if __name__ == '__main__':
    main()
