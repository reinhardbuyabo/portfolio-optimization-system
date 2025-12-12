"""
Enhanced LSTM Model - Option A with Regularization
Implements proper regularization to prevent overfitting
"""
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.regularizers import l2
from tensorflow.keras.optimizers import Adam


def create_regularized_lstm(
    input_shape: tuple,
    lstm_units: int = 50,
    dense_units: int = 25,
    dropout_rate: float = 0.3,
    l2_reg: float = 0.01,
    learning_rate: float = 0.001,
    use_batch_norm: bool = True
) -> Sequential:
    """
    Create LSTM model with proper regularization to prevent overfitting.
    
    Args:
        input_shape: Shape of input data (sequence_length, features)
        lstm_units: Number of units in LSTM layers
        dense_units: Number of units in dense hidden layer
        dropout_rate: Dropout rate (0.0-0.5)
        l2_reg: L2 regularization strength
        learning_rate: Learning rate for Adam optimizer
        use_batch_norm: Whether to use batch normalization
        
    Returns:
        Compiled Keras Sequential model
        
    Architecture:
        - LSTM(50) with L2 regularization + BatchNorm + Dropout(0.3)
        - LSTM(50) with L2 regularization + BatchNorm + Dropout(0.3)
        - Dense(25) with L2 regularization + Dropout(0.2)
        - Dense(1) output layer
        
    Regularization Techniques:
        1. L2 weight regularization - prevents large weights
        2. Dropout - randomly disables neurons during training
        3. Batch normalization - normalizes layer inputs
        4. Early stopping - stops when validation loss stops improving
    """
    
    model = Sequential([
        # First LSTM layer with return sequences
        LSTM(
            units=lstm_units,
            return_sequences=True,
            input_shape=input_shape,
            kernel_regularizer=l2(l2_reg),
            recurrent_regularizer=l2(l2_reg),
            name='lstm_1'
        ),
        BatchNormalization(name='batch_norm_1') if use_batch_norm else None,
        Dropout(dropout_rate, name='dropout_1'),
        
        # Second LSTM layer
        LSTM(
            units=lstm_units,
            return_sequences=False,
            kernel_regularizer=l2(l2_reg),
            recurrent_regularizer=l2(l2_reg),
            name='lstm_2'
        ),
        BatchNormalization(name='batch_norm_2') if use_batch_norm else None,
        Dropout(dropout_rate, name='dropout_2'),
        
        # Dense hidden layer
        Dense(
            units=dense_units,
            activation='relu',
            kernel_regularizer=l2(l2_reg),
            name='dense_1'
        ),
        Dropout(dropout_rate - 0.1, name='dropout_3'),  # Slightly less dropout
        
        # Output layer - linear activation for price prediction
        Dense(units=1, activation='linear', name='output')
    ])
    
    # Remove None layers (from conditional batch norm)
    model = Sequential([layer for layer in model.layers if layer is not None])
    
    # Compile with Huber loss (more robust to outliers than MSE)
    model.compile(
        optimizer=Adam(learning_rate=learning_rate),
        loss='huber',  # Robust to outliers
        metrics=['mae', 'mse']
    )
    
    return model


def create_simple_lstm(input_shape: tuple) -> Sequential:
    """
    Create simple baseline LSTM for comparison.
    No regularization - useful for testing if regularization is needed.
    """
    model = Sequential([
        LSTM(32, input_shape=input_shape),
        Dense(1)
    ])
    
    model.compile(
        optimizer='adam',
        loss='mse',
        metrics=['mae']
    )
    
    return model


def create_lstm_with_custom_config(config: dict) -> Sequential:
    """
    Create LSTM model from configuration dictionary.
    Useful for hyperparameter tuning.
    
    Args:
        config: Dictionary with model configuration
            {
                'lstm_units': 50,
                'dense_units': 25,
                'dropout_rate': 0.3,
                'l2_reg': 0.01,
                'learning_rate': 0.001,
                'use_batch_norm': True,
                'input_shape': (60, 1)
            }
    """
    return create_regularized_lstm(
        input_shape=config['input_shape'],
        lstm_units=config.get('lstm_units', 50),
        dense_units=config.get('dense_units', 25),
        dropout_rate=config.get('dropout_rate', 0.3),
        l2_reg=config.get('l2_reg', 0.01),
        learning_rate=config.get('learning_rate', 0.001),
        use_batch_norm=config.get('use_batch_norm', True)
    )


# Default model creation function for backward compatibility
def create_lstm_model(input_shape: tuple) -> Sequential:
    """
    Create default regularized LSTM model.
    This replaces the old create_lstm_model function.
    """
    return create_regularized_lstm(input_shape)


if __name__ == "__main__":
    # Test model creation
    print("Testing model architectures...\n")
    
    # Test regularized model
    print("1. Regularized LSTM (Option A):")
    model_reg = create_regularized_lstm(input_shape=(60, 1))
    model_reg.summary()
    print(f"\nTotal parameters: {model_reg.count_params():,}")
    
    print("\n" + "="*80 + "\n")
    
    # Test simple model
    print("2. Simple LSTM (Baseline):")
    model_simple = create_simple_lstm(input_shape=(60, 1))
    model_simple.summary()
    print(f"\nTotal parameters: {model_simple.count_params():,}")
    
    print("\n" + "="*80 + "\n")
    
    # Test custom config
    print("3. Custom Configuration:")
    custom_config = {
        'input_shape': (60, 1),
        'lstm_units': 64,
        'dense_units': 32,
        'dropout_rate': 0.4,
        'l2_reg': 0.05,
        'learning_rate': 0.0005,
        'use_batch_norm': True
    }
    model_custom = create_lstm_with_custom_config(custom_config)
    print(f"Custom model created with config: {custom_config}")
    print(f"Total parameters: {model_custom.count_params():,}")
