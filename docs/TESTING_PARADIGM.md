
# Testing Paradigm: Feature-Oriented & Coverage Overview

This document details our comprehensive testing strategy, ensuring the Portfolio Optimization System is reliable, secure, and accurate. We combine **Unit**, **Integration**, and **End-to-End (E2E)** tests to validate every feature, from isolated logic to full user workflows.

---


## Module-Based Test Case Summary

### Authentication Module
| Test Case | Description | Test Data | Expected Outcome | Actual Results | Test Verdict (Pass/Fail) |
|-----------|-------------|-----------|------------------|---------------|--------------------------|
| 2FA Code Validation | Validates 2FA code format and expiry | Valid/invalid codes, expiry times | Accepts valid, rejects invalid/expired | All cases handled as expected | Pass |
| Email/Password Validation | Validates email and password schema | Various email/password inputs | Accepts valid, rejects invalid | All cases handled as expected | Pass |
| Role Permission Logic | Checks user role access | Roles: INVESTOR, ANALYST, etc. | Correct access per role | Matches expected access | Pass |
| Passkey Registration | Validates passkey registration logic | Mocked passkey data | Successful registration | Registration logic works | Pass |
| 2FA Auth Flow (E2E) | Full 2FA login journey | User credentials, 2FA code | Authenticated, dashboard access | Flow completes as expected | Pass |
| Password Reset (E2E) | User resets password via UI | Email, new password | Old password rejected, new accepted | Flow completes as expected | Pass |
| Google OAuth (E2E) | OAuth login and session | Google user data | Session created, user logged in | Flow completes as expected | Pass |
| Passkey Auth (E2E) | Passkey login flow | Passkey data | Authenticated, session created | Flow completes as expected | Pass |
| Role JWT Validation (E2E) | JWT contains correct role | Various user roles | JWT role matches user | JWT role correct | Pass |

### Stock Analysis & Machine Learning Module
| Test Case | Description | Test Data | Expected Outcome | Actual Results | Test Verdict (Pass/Fail) |
|-----------|-------------|-----------|------------------|---------------|--------------------------|
| LSTM Model Construction | Validates LSTM model layers/dimensions | Sample input data | Correct model structure | Model built as expected | Pass |
| GARCH Model Construction | Validates GARCH model layers/dimensions | Sample input data | Correct model structure | Model built as expected | Pass |
| Model Reproducibility | Ensures same data yields same model | Identical training data | Identical weights | Weights match | Pass |
| API Prediction Endpoint | Validates /api/v4/predict | Stock ticker requests | Valid JSON response | Response format correct | Pass |

### Portfolio Module
| Test Case | Description | Test Data | Expected Outcome | Actual Results | Test Verdict (Pass/Fail) |
|-----------|-------------|-----------|------------------|---------------|--------------------------|
| Portfolio Optimization | Weights sum to 1, risk-adjusted returns | Sample stock predictions | Correct weights, sum to 1 | All checks pass | Pass |
| Portfolio Creation (E2E) | User creates portfolio via UI | Form inputs, user session | Portfolio created, visible | Portfolio appears on dashboard | Pass |
| Portfolio Viewing (E2E) | User views portfolio details | Portfolio in DB, user session | Details displayed correctly | Details match DB | Pass |

---


## Core Feature: User Authentication & Security

**Functionality Tested:**
- Email & Password Sign-in
- Two-Factor Authentication (2FA) via Email
- Google OAuth Sign-in
- Passwordless Sign-in with Passkeys (WebAuthn)
- Password Reset Flow
- Role-Based Access Control

**Unit Tests:**
- Zod schema validation for email, password, and 2FA codes (`validators.test.ts`)
- Code generation and expiry logic
- Role permission logic and display (`auth-utils.test.ts`)
- Passkey server actions (mocked WebAuthn logic, `passkey-actions.test.ts`)

**E2E Tests:**
- Full 2FA login flow (`2fa-auth-flow.e2e.test.ts`)
- Password reset and 2FA verification (`password-reset-2fa-flow.e2e.test.ts`)
- Google OAuth authentication and session management (`google-oauth-auth-flow.e2e.test.ts`)
- Passkey registration and authentication (`passkey-auth-flow.e2e.test.ts`)
- Role JWT validation for all user types (`role-jwt-validation.e2e.test.ts`)

---


## Core Feature: Machine Learning Predictions

**Functionality Tested:**
- LSTM Model for Price Prediction
- GARCH Model for Volatility Forecasting
- API Endpoints for predictions
- Model training reproducibility

**Unit Tests:**
- LSTM and GARCH model construction and input/output validation (`test_lstm_model.py`, `test_garch_model.py`)
- Reproducibility of model training (`test_reproducibility.py`)
- Portfolio optimization logic (weights, Sharpe ratio, diversification, negative Sharpe handling, `portfolio-predictions.test.ts`)

**Integration Tests:**
- FastAPI endpoints: `/api/v4/predict` for LSTM and GARCH predictions
- Health endpoint and API error handling

**Statistical Validation:**
- Walk-Forward Validation for real-world simulation
- MAPE calculation for forecast accuracy

---


## Core Feature: Portfolio Management

**Functionality Tested:**
- Portfolio creation (name, risk tolerance, target return)
- Viewing portfolio details, allocations, and metrics
- Portfolio optimization backend logic

**Unit Tests:**
- Portfolio creation logic and input validation
- Optimization function: weights sum to 1, risk-adjusted returns, negative Sharpe handling (`portfolio-predictions.test.ts`)

**E2E Tests:**
- Portfolio creation workflow: login, form submission, dashboard update (`portfolio-creation.e2e.test.ts`)
- Portfolio viewing: database setup, navigation, detail verification (`portfolio-viewing.e2e.test.ts`)

---


## Test Coverage Summary

- All core authentication, ML, and portfolio features are covered by both unit and E2E tests.
- Unit tests validate business logic, input validation, and model construction.
- E2E tests simulate real user journeys, including authentication, portfolio workflows, and role-based access.
- Integration tests ensure API endpoints deliver correct, formatted responses.
- Statistical validation confirms financial model accuracy in real-world scenarios.

## How to Run Tests

- **Python ML tests:** `tox -e test-all -c ml/tox.ini`
- **JavaScript/TypeScript tests:** `npm test` (unit, integration, E2E)
- **E2E tests:** `npm run test:e2e` (Playwright/Vitest)

By testing each feature at multiple levels, we ensure the system is functionally correct, secure, statistically sound, and delivers a reliable user experience.
