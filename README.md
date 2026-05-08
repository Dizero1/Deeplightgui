# DeepLight GUI

This folder contains the frontend for the DeepLight image restoration and detection web GUI.

## Overview

The application is a single-page web interface built with plain HTML, CSS, and JavaScript.
It supports three main workflows:

- **Upload & Restore**: upload a degraded image and run a restoration model.
- **Comparison Screen**: upload a single image and compare outputs from multiple restoration models side by side.
- **Detection Screen**: upload an image, select a model, and view both a custom model output and a YOLOv8 output.

The frontend is implemented in:

- `index.html` — page structure and UI layout
- `style.css` — theme, layout, and responsive styling
- `script.js` — SPA logic, dropzone uploads, button actions, and API integration stubs

## Backend API requirements

The frontend expects the backend to provide the following endpoints.

### `POST /restore`

Restore a single image using the selected model.

Request:

- `Content-Type`: `multipart/form-data`
- Form fields:
  - `image` — image file upload
  - `model` — selected model name (`AirNet`, `PromptIR`, `Modified PromptIR`)

Response:

- Successful response should return the restored image binary stream.
- The frontend currently expects a blob and creates an object URL from it.

Example server behavior:

```js
const formData = new FormData();
formData.append('image', file);
formData.append('model', selectedModel);
```

### `POST /compare`

Compare restoration outputs across multiple models.

Request:

- `Content-Type`: `multipart/form-data`
- Form fields:
  - `image` — image file upload

Response:

- JSON object containing image payloads for each model.
- The frontend expects:

```json
{
  "modelA": "<base64-data-or-url>",
  "modelB": "<base64-data-or-url>",
  "modelC": "<base64-data-or-url>"
}
```

- Each field may be a data URL (`data:image/png;base64,...`) or a remote URL.

### `POST /detect`

Run object detection and return annotated detection outputs.

Request:

- `Content-Type`: `multipart/form-data`
- Form fields:
  - `image` — image file upload
  - `model` — selected model name (`AirNet`, `PromptIR`, `Modified PromptIR`)

Response:

- JSON object containing two result images:

```json
{
  "custom": "<base64-data-or-url>",
  "yolov8": "<base64-data-or-url>"
}
```

- The frontend will display `custom` in the custom model panel and `yolov8` in the YOLOv8 panel.
- The backend is responsible for drawing bounding boxes or annotations into the returned images.

## Notes for backend integration

- The frontend does not perform any image processing itself; it relies on the backend for actual restoration and detection outputs.
- The frontend currently uses mock stubs; to enable real behavior, replace the stubbed API logic in `script.js` with actual `fetch` calls.
- The download feature saves the returned image URL directly.

## Recommended improvements

- Add real API error handling and retry logic.
- Support separate download buttons for each detection output panel.
- Add upload validation for max file size and supported image formats.
- Implement a backend health check or status endpoint for integration testing.
