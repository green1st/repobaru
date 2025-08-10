# AI Rules for this Application

This document outlines the technical stack and guidelines for developing and modifying this web application.

## Tech Stack

*   **Frontend Framework**: React with TypeScript.
*   **Styling**: Tailwind CSS for all component styling and responsive design.
*   **UI Components**: Shadcn/ui for pre-built, accessible UI components.
*   **Icons**: Lucide React for all icon needs.
*   **Routing**: React Router for client-side navigation (routes should be defined in `src/App.tsx`).
*   **Backend Runtime**: Node.js.
*   **Web Framework (Backend)**: Express.js for building RESTful APIs.
*   **XRPL Integration**: `xrpl` library for interacting with the XRP Ledger.
*   **Exchange Integration**: `bitget-api` library for interacting with the Bitget exchange.
*   **Environment Variables**: `dotenv` for managing environment-specific configurations.

## Library Usage Rules

To maintain consistency and efficiency, please adhere to the following rules when making changes or adding new features:

*   **General UI**: Always prefer using existing Shadcn/ui components. If a specific component is not available in Shadcn/ui, create a new, small, and focused component in `src/components/` and style it using Tailwind CSS.
*   **Styling**: All styling must be done using Tailwind CSS classes. Avoid inline styles unless absolutely necessary for dynamic values.
*   **Icons**: Use icons from the `lucide-react` library.
*   **Routing**: If new routes are required, implement them using React Router and define them within `src/App.tsx`. New pages should be placed in `src/pages/`.
*   **State Management**: For local component state, use React's `useState` and `useReducer` hooks. For global state or context, use React Context API.
*   **API Communication (Frontend)**: Use the native `fetch` API for making HTTP requests to the backend.
*   **Backend Logic**: All server-side logic, including API endpoints and external service integrations (XRPL, Bitget), should be implemented using Express.js in `index.js` or modularized files within the backend structure.
*   **XRPL Operations**: Use the `xrpl` library for all interactions with the XRP Ledger (e.g., account info, sending transactions).
*   **Bitget Operations**: Use the `bitget-api` library for all interactions with the Bitget exchange (e.g., getting deposit addresses, converting currency, withdrawals).
*   **File Structure**:
    *   Frontend source code: `src/`.
    *   React components: `src/components/`.
    *   React pages: `src/pages/`.
    *   Main application entry point (frontend): `src/main.tsx`.
    *   Backend server: `index.js`.
    *   Directory names must be all lower-case.
*   **Responsiveness**: All new UI components and modifications must be responsive and adapt well to different screen sizes.
*   **Error Handling**: Do not implement `try/catch` blocks for errors unless specifically requested. Errors should bubble up to allow for centralized handling and debugging.
*   **Simplicity**: Prioritize simple and elegant solutions. Avoid over-engineering.
*   **Completeness**: All implemented features must be fully functional with complete code; no placeholders or partial implementations.