from arch import arch_model
import pandas as pd
import numpy as np
import warnings
import time


def create_garch_model(data: pd.Series):
    """Create the GARCH model with Student's T distribution."""
    model = arch_model(data, p=1, q=1, dist='t', mean='Zero')
    return model


def forecast_garch_volatility(
    series_original: pd.Series,
    scale_factor: float = 100.0,
    train_frac: float = 0.8,
    max_retries: int = 1,
    verbose: bool = False
) -> pd.DataFrame:
    """Perform step-by-step GARCH volatility forecasting and evaluation.

    Args:
        series_original (pd.Series): The original log returns series.
        scale_factor (float): Factor to scale the series for model fitting.
        train_frac (float): Fraction of data to use for initial training.
        max_retries (int): Number of retries for model fitting on transient failures.
        verbose (bool): If True, print detailed error messages.

    Returns:
        pd.DataFrame: DataFrame containing forecasted and realized variances.
    """
    # Silence specific warnings coming from 'arch'
    warnings.filterwarnings("ignore", message="y is poorly scaled")
    warnings.filterwarnings("ignore", message="R^2 score is not well-defined "
                                     "with less than two samples.")

    # Remove duplicate indices and sort
    series_original = series_original[~series_original.index.duplicated(
        keep='first')]
    series_original.sort_index(inplace=True)

    if series_original.empty:
        raise ValueError("No log-return data found for the series.")

    # Scaled series (for model fitting)
    series_scaled = series_original * scale_factor

    # Train/test split (by index position)
    n = len(series_scaled)
    train_size = int(np.floor(n * train_frac))
    train_scaled = series_scaled.iloc[:train_size].copy()
    test_scaled = series_scaled.iloc[train_size:].copy()
    # keep original for realized variance
    test_original = series_original.iloc[train_size:].copy()

    # Containers for results
    # forecast variance in ORIGINAL units (not scaled)
    forecasted_variances_original = []
    realized_variances = []              # realized variance (original returns squared)
    forecast_dates = []
    errors_log = []

    # Rolling (expanding) forecast with refit at each step
    start_time = time.time()
    for i, test_date in enumerate(test_scaled.index):
        # Build the data available up to *just before* this test date
        # For the i-th test point we use train + previous (i) test observations (if any)
        if i == 0:
            history_scaled = train_scaled.copy()
        else:
            history_scaled = pd.concat([train_scaled, test_scaled.iloc[:i]])
        
        # Safety: ensure history has no NaNs and has monotonic unique index
        history_scaled = history_scaled.dropna()
        history_scaled = history_scaled[~history_scaled.index.duplicated(
            keep='first')]
        history_scaled.sort_index(inplace=True)

        # If history is too short for fitting, append NaN and continue
        if len(history_scaled) < 10:
            errors_log.append((test_date, "history_too_short"))
            forecasted_variances_original.append(np.nan)
            realized_variances.append((test_original.loc[test_date])**2 
                                      if test_date in test_original.index else np.nan)
            forecast_dates.append(test_date)
            continue

        # Fit GARCH(1,1)-t on the scaled history (suppress printing)
        try:
            # returns centered, mean often zero
            model = arch_model(history_scaled, p=1, q=1, dist='t', mean='Zero')
            res = None
            # retry loop to handle occasional optimizer failures
            last_exception = None
            for attempt in range(max_retries + 1):
                try:
                    res = model.fit(disp='off')
                    break
                except Exception as e_fit:
                    last_exception = e_fit
                    if attempt < max_retries:
                        # small backoff then retry
                        time.sleep(0.1)
                    else:
                        raise
            if res is None:
                raise last_exception

            # Forecast 1-step ahead (no start param; forecast from end of history)
            # Use reindex=False to avoid automatically aligning to model sample index (safer)
            fcast = res.forecast(horizon=1, reindex=False)

            # Extract variance robustly
            var_scaled = None
            try:
                # preferred access (last row, first column)
                var_df = fcast.variance
                if var_df is None or var_df.size == 0:
                    raise ValueError("empty variance DataFrame from forecast")
                # Some versions return a df with shape (1,1) or (k,1);
                # take last row, first column
                var_scaled = float(var_df.values[-1, 0])
            except Exception as e_var:
                # fallback: try .variance.iloc[0,0]
                try:
                    var_scaled = float(fcast.variance.iloc[0, 0])
                except Exception as e2:
                    raise RuntimeError(f"Could not extract forecast variance: "
                                       f"{e_var}; {e2}")

            # Convert variance back to ORIGINAL units:
            # Var_original = Var_scaled / (scale_factor^2)
            var_original = var_scaled / (scale_factor ** 2)

            # Realized variance for this test_date (original returns squared)
            if test_date in test_original.index:
                realized_var = float((test_original.loc[test_date]) ** 2)
            else:
                realized_var = np.nan

            # Save results
            forecasted_variances_original.append(var_original)
            realized_variances.append(realized_var)
            forecast_dates.append(test_date)

        except Exception as e:
            # If anything fails, log and store NaN to keep alignment
            errors_log.append((test_date, repr(e)))
            forecasted_variances_original.append(np.nan)
            realized_variances.append((test_original.loc[test_date])**2 
                                      if test_date in test_original.index else np.nan)
            forecast_dates.append(test_date)
            if verbose:
                print(f"Error during forecasting for date {test_date}: {e}")

    elapsed = time.time() - start_time
    if verbose:
        print(f"\nRolling forecasting loop finished in {elapsed:.2f} seconds. "
              f"Forecast attempts: {len(forecast_dates)}. Errors: {len(errors_log)}")

    # Build evaluation DataFrame and clean
    eval_df = pd.DataFrame({
        'forecasted_variance': forecasted_variances_original,
        'realized_variance': realized_variances
    }, index=pd.DatetimeIndex(forecast_dates))

    # Ensure numeric and drop rows with NaNs in either column
    eval_df['forecasted_variance'] = pd.to_numeric(eval_df['forecasted_variance'], 
                                                  errors='coerce')
    eval_df['realized_variance'] = pd.to_numeric(eval_df['realized_variance'], 
                                                errors='coerce')
    eval_df.dropna(subset=['forecasted_variance', 'realized_variance'], 
                   inplace=True)

    if verbose:
        print(f"Shape of evaluation_df after dropping NaNs: {eval_df.shape}")

    return eval_df
