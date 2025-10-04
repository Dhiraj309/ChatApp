from fastapi import APIRouter, Body, UploadFile, File
from fastapi.responses import StreamingResponse, JSONResponse
from app.state import uploaded_text_store

import os
import requests
from io import BytesIO
import PyPDF2
import docx
from dotenv import load_dotenv


from fastapi import APIRouter, Body
from fastapi.responses import StreamingResponse, JSONResponse
from app.state import uploaded_text_store
import os
import requests
from dotenv import load_dotenv

load_dotenv()

INFERENCE_API_KEY = os.getenv("INFERENCE_API_KEY")
COLAB_URL = os.getenv("COLAB_URL")

router = APIRouter()

@router.post("/")
def chat(payload: dict = Body(...)):
    """
    Proxy endpoint to forward requests to the Colab inference server.
    Supports three modes:
      - Default: normal conversation
      - DocAware: document-aware reasoning
      - WebSearch: context from web pages
    """

    message = payload.get("message", "")
    mode = payload.get("mode", "Default")
    raw_text = payload.get("raw_text", "")

    if not message and mode != "DocAware":
        return JSONResponse(
            {"error": "Message cannot be empty."},
            status_code=400
        )

    def event_stream():
        """Stream tokens from Colab inference server."""
        try:
            with requests.post(
                f"{COLAB_URL}/chat/",
                headers={"Authorization": f"Bearer {INFERENCE_API_KEY}"},
                json={
                    "message": message,
                    "mode": mode,
                    "raw_text": raw_text
                },
                stream=True,
                timeout=600
            ) as r:
                if r.status_code != 200:
                    yield f"Error {r.status_code}: {r.text}"
                    return

                for chunk in r.iter_content(chunk_size=None):
                    if chunk:
                        yield chunk.decode("utf-8")

        except Exception as e:
            yield f"Error contacting Colab inference server: {e}"

    return StreamingResponse(event_stream(), media_type="text/plain")

# =============================
# File upload endpoint (DocAware)
# =============================

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith((".txt", ".pdf", ".docx")):
        return JSONResponse({"error": "Unsupported file type"}, status_code=400)

    content = await file.read()
    text = ""

    try:
        if file.filename.endswith(".txt"):
            text = content.decode("utf-8")
        elif file.filename.endswith(".pdf"):
            reader = PyPDF2.PdfReader(BytesIO(content))
            text = "\n".join([page.extract_text() or "" for page in reader.pages])
        elif file.filename.endswith(".docx"):
            doc = docx.Document(BytesIO(content))
            text = "\n".join([para.text for para in doc.paragraphs])
    except Exception as e:
        return JSONResponse({"error": f"Failed to extract text: {str(e)}"}, status_code=500)

    # Store uploaded text for DocAware
    uploaded_text_store["chunks"].append(text)

    return {"text": text}
