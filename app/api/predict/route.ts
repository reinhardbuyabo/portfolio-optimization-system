import { NextRequest, NextResponse } from "next/server";

// NOTE: This endpoint is DEPRECATED. Use /api/ml/predict instead.
// TensorFlow.js is not installed and ML predictions are handled by the Python ML API.

let model: any | null = null;

async function loadModel() {
  // TensorFlow import disabled - use Python ML API instead
  throw new Error("This endpoint is deprecated. Use /api/ml/predict instead.");
  
  // if (model) {
  //   return model;
  // }
  // const tf = await import("@tensorflow/tfjs-node");
  // // Adjust the path to your .h5 model file
  // const modelPath = `file://${process.cwd()}/ml/trained_models/0.0.1.h5`;
  // console.log("Loading model from:", modelPath);
  // model = await tf.loadLayersModel(modelPath);
  // console.log("Model loaded.");
  // return model;
}

export async function POST(req: NextRequest) {
  try {
    const { symbol, historical_prices } = await req.json();

    if (!symbol || !historical_prices || !Array.isArray(historical_prices)) {
      return NextResponse.json(
        { error: "Invalid input: symbol and historical_prices are required." },
        { status: 400 }
      );
    }

    // Deprecated: Use Python ML API instead
    return NextResponse.json(
      { error: "This endpoint is deprecated. Use /api/ml/predict instead." },
      { status: 410 }
    );

// const tf = await import("@tensorflow/tfjs-node");
// const loadedModel = await loadModel();

// Preprocess input data (example: normalize, reshape)
// This is a placeholder for actual preprocessing logic matching your model's training
const inputTensor = tf.tensor2d([historical_prices]);
// Assuming your model expects a specific input shape, e.g., [batch_size, sequence_length, features]
// You might need to reshape and normalize `historical_prices` accordingly.
// For a simple LSTM, it might be [1, sequence_length, 1]
const reshapedInput = inputTensor.reshape([
  1,
  historical_prices.length,
  1,
]);

const predictions = loadedModel.predict(reshapedInput) as any;
const predictionData = predictions.dataSync();

    // Extract predicted return and volatility from predictionData
    // This depends on how your model's output is structured
    const predicted_return = predictionData[0]; // Example
    const predicted_volatility = predictionData[1]; // Example

    return NextResponse.json({
      symbol,
      predicted_return,
      predicted_volatility,
    });
  } catch (error) {
    console.error("Prediction API error:", error);
    return NextResponse.json(
      { error: "Failed to make prediction." },
      { status: 500 }
    );
  }
}
