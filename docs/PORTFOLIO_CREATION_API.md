# Portfolio Creation API Documentation

This document provides an overview of the portfolio creation process, detailing the frontend and backend integration and how to test the API endpoint.

## Frontend and Backend Integration

The portfolio creation feature uses a Next.js Server Action, `createPortfolio`, located in `lib/actions/portfolios.actions.ts`. This action is not a traditional REST API endpoint but a function that runs on the server.

The frontend consists of a form that captures the user's input for the portfolio details. When the user submits the form, the `createPortfolio` server action is called directly. This action handles form data validation, user authentication, and portfolio creation in the database.

### Data Validation

The `createPortfolio` action uses the `createPortfolioSchema` from `lib/validators.ts` to validate the incoming form data. The schema defines the following fields:

- `name`: A string with a minimum of 3 characters.
- `riskTolerance`: An enum that must be one of `"LOW"`, `"MEDIUM"`, or `"HIGH"`.
- `targetReturn`: A number between 0 and 100.

### Authentication and Authorization

The `createPortfolio` action requires the user to be authenticated. It retrieves the user's session using the `auth()` function. If the user is not logged in, the action will return an "Unauthorized" error.

Furthermore, the user must have the role of `INVESTOR` or `PORTFOLIO_MANAGER` to create a portfolio. If the user has a different role, the action will return a "Forbidden" error.

## Testing the API

Since the portfolio creation is handled by a Next.js Server Action, you can't test it with a simple GET request. You need to send a POST request with a `multipart/form-data` content type, simulating a form submission.

### Prerequisites

1.  **Authentication**: You need a valid session cookie for an authenticated user with the appropriate role (`INVESTOR` or `PORTFOLIO_MANAGER`). You can obtain this cookie by signing in to the application through your web browser and copying the cookie value from the browser's developer tools. The cookie is typically named `authjs.session-token`.

2.  **User Role**: Ensure the user you are using for testing has the `INVESTOR` or `PORTFOLIO_MANAGER` role.

### `curl` Example

Here is an example of how to test the `createPortfolio` action using `curl`. Replace `YOUR_SESSION_COOKIE` with the actual session cookie value.

```bash
curl -X POST http://localhost:3000/dashboard/portfolios \
  -H "Content-Type: multipart/form-data" \
  -H "Cookie: authjs.session-token=YOUR_SESSION_COOKIE" \
  -F "name=My New Portfolio" \
  -F "riskTolerance=MEDIUM" \
  -F "targetReturn=50"
```

**Note**: The URL in the `curl` command (`/dashboard/portfolios`) is the page where the form is located and the action is triggered. The server action itself doesn't have a unique URL.

### Postman Example

1.  **Create a new POST request** to `http://localhost:3000/dashboard/portfolios`.
2.  **In the "Headers" tab**, add the following:
    - `Cookie`: `authjs.session-token=YOUR_SESSION_COOKIE`
3.  **In the "Body" tab**, select `form-data` and add the following key-value pairs:
    - `name`: `My New Portfolio`
    - `riskTolerance`: `MEDIUM`
    - `targetReturn`: `50`
4.  **Send the request.**

You should receive a response indicating whether the portfolio was created successfully or if there were any errors.
